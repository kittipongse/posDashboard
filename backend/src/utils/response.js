export const success = (res, data = {}, message = 'Success', status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data
  });
};

export const successList = (res, data = [], meta = {}, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    meta
  });
};

export const fail = (res, message, code = 'ERROR', status = 400, errors = []) => {
  return res.status(status).json({
    success: false,
    message,
    code,
    errors
  });
};
