const asyncHandler = (requestHandler: CallableFunction) => {
  return (req: any, res: any, next: CallableFunction) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
