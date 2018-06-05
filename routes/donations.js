const express = require('express')
const bodyParser = require('body-parser')
const moment = require('moment')
const config = require('../config.js')
const KID = require('../custom_modules/KID.js')
const Mail = require('../custom_modules/mail.js')
const DAO = require('../custom_modules/DAO.js')

const router = express.Router()
const urlEncodeParser = bodyParser.urlencoded({ extended: false })

router.post("/register", urlEncodeParser, async (req,res,next) => {
  if (!req.body) return res.sendStatus(400)

  let parsedData = JSON.parse(req.body.data)

  let donationOrganizations = parsedData.organizations
  let donor = parsedData.donor

  try {
    var donationObject = {
      KID: null, //Set later in code
      donorID: null, //Set later in code
      amount: parsedData.amount,
      standardSplit: undefined,
      split: []
    }

    //Create a donation split object
    if (parsedData.organizations) {
      donationObject.split = await createDonationSplitArray(parsedData.organizations)
      donationObject.standardSplit = false
    }
    else {
      donationObject.split = await getStandardSplit()
      donationObject.standardSplit = true
    }

    //Check if existing donor
    donationObject.donorID = await DAO.donors.getIDbyEmail(donor.email)

    if (donationObject.donorID == null) {
      //Donor does not exist, create donor
      donationObject.donorID = await DAO.donors.add(donor)
    }

    //Try to get existing KID
    donationObject.KID = await DAO.donations.getKIDbySplit(donationObject.split, donationObject.donorID)

    //Split does not exist create new KID and split
    if (donationObject.KID == null) {
      donationObject.KID = await createKID()
      await DAO.donations.addSplit(donationObject)
    }
  }
  catch (ex) {
    return next({ex: ex})
  }

  //In case the email component should fail, register the donation anyways, and notify client
  res.json({
    status: 200, //Temp for testing
    content: {
      KID: donationObject.KID
    }
  })
})

router.post("/bank/:KID/:sum", (req, res) => {
  res.status(501).json({
    status: 501,
    content: "Not implemented"
  })
  //sendDonationReciept(donationObject, donor.email, donor.name)
})

async function createDonationSplitArray(passedOrganizations) {
  return new Promise(async function(fulfill, reject) {
    //Filter passed organizations for 0 shares
    var filteredOrganizations = passedOrganizations.filter(org => org.split > 0)

    try {
      var organizationIDs = filteredOrganizations.reduce((acc, org) => {
        acc.push(org.id);
        return acc;
      }, [])
      var orgs = await DAO.organizations.getByIDs(organizationIDs)
    }
    catch (ex) {
      return reject(ex)
    }

    if (orgs.length != filteredOrganizations.length) return reject(new Error("Could not find all organizations in DB"))

    var donationSplits = []

    for (var i = 0; i < orgs.length; i++) {
      for (var j = 0; j < filteredOrganizations.length; j++) {
        if (filteredOrganizations[j].id == orgs[i].ID) {
          donationSplits.push({
            organizationID: orgs[i].ID,
            share: filteredOrganizations[j].split,
            name: orgs[i].full_name
          })

          filteredOrganizations.splice(j,1)
          orgs.splice(i,1)
          i--

          break
        }
      }
    }

    fulfill(donationSplits)
  })
}

async function getStandardSplit() {
  return new Promise(async (fulfill, reject) => {
    try {
      var split = await DAO.organizations.getStandardSplit()
    }
    catch(ex) {
      return reject(ex)
    }

    fulfill(split)
  })
}


router.get('/total', urlEncodeParser, async (req,res,next) => {
  //Check if no parameters
  if (!req.query) return res.json({ status: 400, content: "Malformed request" })

  //Check if dates are valid ISO 8601
  if (!moment(req.query.fromDate, moment.ISO_8601, true).isValid() || !moment(req.query.toDate, moment.ISO_8601, true).isValid()) return res.json({ status: 400, content: "Date must be in ISO 8601 format" })

  let fromDate = new Date(req.query.fromDate)
  let toDate = new Date(req.query.toDate)

  try {
    var aggregate = await DAO.donations.getAggregateByTime(fromDate, toDate)

    res.json({
      status: 200,
      content: aggregate
    })
  } catch(ex) {
    next({ex: ex})
  }
})

router.get('/:id', async (req,res,next) => {
  try {
    var donation = await DAO.donations.getByID(req.params.id)

    res.json({
      status: 200,
      content: donation
    })
  } catch(ex) {
    next({ex: ex})
  }
})

//Helper functions
function createKID() {
  return new Promise(async (fulfill, reject) => {
    //Create new valid KID
    let newKID = KID.generate()
    //If KID already exists, try new kid, call this function recursively
    try {
      if (await DAO.donations.KIDexists(newKID)) {
        newKID = await createKID()
      }
    } catch(ex) {
      reject(ex)
    }

    fulfill(newKID)
  })
}

module.exports = router
