class ApiResponse {
  statusCode: any;
  data: any;
  message: string;
  success: any;
  constructor(statusCode: any, data: any, message = "Success") {
    (this.statusCode = statusCode),
      (this.data = data),
      (this.message = message),
      (this.success = statusCode);
  }
}

export { ApiResponse };
