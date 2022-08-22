var con;

//region Get
/**
 * Get payment methods from database
 * @returns {Array} An array of payment method objects
 */
async function getMethods() {
  try {
    var [res] = await con.query(`SELECT * FROM Payment`);

    if (res.length > 0) {
      return mapDBpaymentToObject(res);
    } else {
      return null;
    }
  } catch (ex) {
    throw ex;
  }
}

/**
 * Gets payment methods filtered by provided ID's
 * @param paymentMethodIDs The payment method ID's to filter on
 * @returns {Array} An array of payment method objects
 */
async function getPaymentMethodsByIDs(paymentMethodIDs) {
  try {
    var [res] = await con.query(
      `SELECT * FROM Payment 
                                        WHERE ID IN (?)`,
      [paymentMethodIDs]
    );

    if (res.length > 0) {
      return mapDBpaymentToObject(res);
    } else {
      return null;
    }
  } catch (ex) {
    throw ex;
  }
}

//endregion

//region Add

//endregion

//region Modify

//endregion

//region Delete
//endregion

//Helpers
function mapDBpaymentToObject(dbPaymentObject) {
  return dbPaymentObject.map((method) => {
    return {
      id: method.ID,
      name: method.payment_name,
      abbriviation: method.abbriv,
      shortDescription: method.short_desc,
      flatFee: method.flat_fee,
      percentageFee: method.percentage_fee,
      lastUpdated: method.lastUpdated,
    };
  });
}

export const payment = {
  getMethods,
  getPaymentMethodsByIDs,

  setup: (dbPool) => {
    con = dbPool;
  },
};
