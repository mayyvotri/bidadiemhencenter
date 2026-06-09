export const getSalarySummary = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      salary: null
    });
  } catch (error) {
    next(error);
  }
};

export const getSalaryHistory = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      history: []
    });
  } catch (error) {
    next(error);
  }
};
