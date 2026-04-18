export type WarrantyFileUrls = {
  invoice: string;
  serial: string;
  full: string;
  closeup: string;
};

export type WarrantyPayload = {
  submissionId: string;
  name: string;
  surname: string;
  company: string;
  email: string;
  phone: string;
  typeOfPartner: string;
  address: string;
  invoiceNumber: string;
  invoiceIssuedBy: string;
  dateOfPurchase: string;
  countryOfPurchase: string;
  productName: string;
  productCategory: string;
  serialNumber: string;
  dateOfFailure: string;
  problemDescription: string;
  fileUrls: WarrantyFileUrls;
  dataPolicyAccepted: boolean;
};
