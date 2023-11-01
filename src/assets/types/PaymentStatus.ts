type Status = "PAID" | "TO_PAY" | "OVER_DUE";
// export default PaymentStatus;
export interface PaymentStatus {
  name: Status;
  viewName: string;
}
