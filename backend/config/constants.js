





const WEIGHT_TOLERANCE_GRAMS = Number(process.env.WEIGHT_TOLERANCE_GRAMS) || 5;


const CART_STATUS = {
  ACTIVE: 'ACTIVE',
  CHECKOUT: 'CHECKOUT',
  WAITING_FOR_CASHIER: 'WAITING_FOR_CASHIER',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};


const WEIGHT_STATUS = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  MISMATCH: 'MISMATCH'
};



const BUDGET_WARNING_THRESHOLD_PERCENT = 0.20;

const BUDGET_STATUS = {
  WITHIN_BUDGET: 'WITHIN_BUDGET',
  NEAR_LIMIT: 'NEAR_LIMIT',
  OVER_BUDGET: 'OVER_BUDGET'
};







const calculateBudgetStatus = (budget, total) => {
  const remainingBudget = Number((budget - total).toFixed(2));
  
  if (budget <= 0) {
    return {
      remainingBudget: 0,
      budgetStatus: BUDGET_STATUS.WITHIN_BUDGET
    };
  }

  if (remainingBudget < 0) {
    return {
      remainingBudget,
      budgetStatus: BUDGET_STATUS.OVER_BUDGET
    };
  }

  const threshold = budget * BUDGET_WARNING_THRESHOLD_PERCENT;
  if (remainingBudget < threshold) {
    return {
      remainingBudget,
      budgetStatus: BUDGET_STATUS.NEAR_LIMIT
    };
  }

  return {
    remainingBudget,
    budgetStatus: BUDGET_STATUS.WITHIN_BUDGET
  };
};








const verifyWeight = (expectedWeight, verifiedWeight, tolerance = WEIGHT_TOLERANCE_GRAMS) => {
  const difference = Number(Math.abs(expectedWeight - verifiedWeight).toFixed(2));
  const isVerified = difference <= tolerance;
  return {
    isVerified,
    difference,
    status: isVerified ? WEIGHT_STATUS.VERIFIED : WEIGHT_STATUS.MISMATCH
  };
};

module.exports = {
  WEIGHT_TOLERANCE_GRAMS,
  CART_STATUS,
  WEIGHT_STATUS,
  BUDGET_STATUS,
  BUDGET_WARNING_THRESHOLD_PERCENT,
  calculateBudgetStatus,
  verifyWeight
};
