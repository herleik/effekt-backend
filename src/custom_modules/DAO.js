const config = require("../config");
const mysql = require("mysql2/promise");

module.exports = {
  //Submodules
  donors: require("./DAO_modules/donors"),
  organizations: require("./DAO_modules/organizations"),
  donations: require("./DAO_modules/donations"),
  distributions: require("./DAO_modules/distributions"),
  payment: require("./DAO_modules/payment"),
  vipps: require("./DAO_modules/vipps"),
  parsing: require("./DAO_modules/parsing"),
  referrals: require("./DAO_modules/referrals"),
  auth: require("./DAO_modules/auth"),
  meta: require("./DAO_modules/meta"),
  initialpaymentmethod: require("./DAO_modules/initialpaymentmethod"),
  avtalegiroagreements: require("./DAO_modules/avtalegiroagreements"),
  facebook: require("./DAO_modules/facebook"),
  logging: require("./DAO_modules/logging"),

  /**
   * Sets up a connection to the database, uses config.js file for parameters
   * @param {function} cb Callback for when DAO has been sucessfully set up
   */
  connect: async function (cb) {
    const dbSocketPath = process.env.DB_SOCKET_PATH || "/cloudsql";

    if (process.env.K_SERVICE != null) {
      // Running in google cloud
      var dbPool = await mysql.createPool({
        user: config.db_username,
        password: config.db_password,
        database: config.db_name,
        socketPath: `${dbSocketPath}/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
        enableKeepAlive: true,
      });
    } else {
      // Running locally
      var dbPool = await mysql.createPool({
        user: config.db_username,
        password: config.db_password,
        database: config.db_name,
        host: "127.0.0.1",
        enableKeepAlive: true,
      });
    }

    //Check whether connection was successfull
    //Weirdly, this is the proposed way to do it
    try {
      await dbPool.query("SELECT 1 + 1 AS Solution");
      console.log("Connected to database | Using database " + config.db_name);
    } catch (ex) {
      console.error(
        "Connection to database failed! | Using database " + config.db_name
      );
      console.log(ex);
      process.exit();
    }

    //Setup submodules
    this.donors.setup(dbPool);
    this.organizations.setup(dbPool);
    this.donations.setup(dbPool, this);
    this.distributions.setup(dbPool, this);
    this.payment.setup(dbPool);
    this.vipps.setup(dbPool);
    this.parsing.setup(dbPool);
    this.referrals.setup(dbPool);
    this.auth.setup(dbPool);
    this.meta.setup(dbPool);
    this.initialpaymentmethod.setup(dbPool);
    this.avtalegiroagreements.setup(dbPool);
    this.facebook.setup(dbPool);
    this.logging.setup(dbPool);

    //Convenience functions for transactions
    //Use the returned transaction object for queries in the transaction
    dbPool.startTransaction = async function () {
      try {
        let transaction = await dbPool.getConnection();
        await transaction.query("START TRANSACTION");
        return transaction;
      } catch (ex) {
        console.log(ex);
        throw new Error("Fatal error, failed to start transaction");
      }
    };

    dbPool.rollbackTransaction = async function (transaction) {
      try {
        await transaction.query("ROLLBACK");
        transaction.release();
      } catch (ex) {
        console.log(ex);
        throw new Error("Fatal error, failed to rollback transaction");
      }
    };

    dbPool.commitTransaction = async function (transaction) {
      try {
        await transaction.query("COMMIT");
        transaction.release();
      } catch (ex) {
        console.log(ex);
        throw new Error("Fatal error, failed to commit transaction");
      }
    };

    cb();
  },
};
