var pool;

//region Get

/**
 * Returns all organizations found with given IDs
 * @param {Array<number>} IDs
 * @returns {Array<Organization>}
 */
async function getByIDs(IDs) {
  try {
    var con = await pool.getConnection();
    var [organizations] = await con.execute(
      "SELECT * FROM Organizations WHERE ID in (" +
        "?,".repeat(IDs.length).slice(0, -1) +
        ")",
      IDs
    );

    con.release();
    return organizations;
  } catch (ex) {
    con.release();
    throw ex;
  }
}

/**
 * Returns an organization with given ID
 * @param {number} ID
 * @returns {Organization}
 */
async function getByID(ID) {
  try {
    var con = await pool.getConnection();
    var [organization] = await con.execute(
      "SELECT * FROM Organizations WHERE ID = ? LIMIT 1",
      [ID]
    );

    con.release();
    if (organization.length > 0) return organization[0];
    else return null;
  } catch (ex) {
    con.release();
    throw ex;
  }
}

/**
 * Returns current active organiztions
 * Active meaning we accept donations for them
 * Inactive organizations are organizations which we no longer support
 * @returns {Array<Organization>}
 */
async function getActive() {
  try {
    var con = await pool.getConnection();
    var [organizations] = await con.execute(`
            SELECT * FROM Organizations 
                WHERE is_active = 1
                ORDER BY ordering ASC`);

    con.release();
    return organizations.map(mapOrganization);
  } catch (ex) {
    con.release();
    throw ex;
  }
}

/**
 * Returns all organizations in the database
 * @returns {Array<Organization>} All organizations in DB
 */
async function getAll() {
  try {
    var con = await pool.getConnection();
    var [organizations] = await con.execute(`SELECT * FROM Organizations`);

    con.release();
    return organizations.map(mapOrganization);
  } catch (ex) {
    con.release();
    throw ex;
  }
}

async function getStandardSplit() {
  try {
    var con = await pool.getConnection();
    var [standardSplit] = await con.execute(
      `SELECT * FROM Organizations WHERE std_percentage_share > 0 AND is_active = 1`
    );
    con.release();
  } catch (ex) {
    con.release();
    throw ex;
  }

  if (
    standardSplit.reduce((acc, org) => (acc += org.std_percentage_share), 0) !=
    100
  )
    return Error("Standard split does not sum to 100 percent");

  return standardSplit.map((org) => {
    return {
      organizationID: org.ID,
      name: org.full_name,
      share: org.std_percentage_share,
    };
  });
}
//endregion

//region Add
//endregion

//region Modify
//endregion

//region Delete
//endregion

//region Helpers
/**
 * Used in array.map, used to map database rows to JS like naming
 * @param {Object} org A line from a database query representing an organization
 * @returns {Object} A mapping with JS like syntax instead of the db fields, camel case instead of underscore and so on
 */
function mapOrganization(org) {
  return {
    id: org.ID,
    name: org.full_name,
    abbriv: org.abbriv,
    shortDesc: org.short_desc,
    standardShare: org.std_percentage_share,
    infoUrl: org.info_url,
  };
}

export const organizations = {
  getByIDs,
  getByID,
  getActive,
  getAll,
  getStandardSplit,

  setup: (dbPool) => {
    pool = dbPool;
  },
};
