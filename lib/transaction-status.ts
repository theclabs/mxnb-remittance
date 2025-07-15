export type TransactionStatus =
  | "pending_user_start"
  | "pending_deposit"
  | "pending_invite"
  | "completed"
  | "pending_claim"
  | "claiming"
  | "processing"

export interface TransactionStatusInfo {
  label: string
  description: string
  userAction?: string
  systemBehavior: string
  color: string
  bgColor: string
}

export const TRANSACTION_STATUSES: Record<TransactionStatus, TransactionStatusInfo> = {
  pending_user_start: {
    label: "Ready for Claim",
    description:
      "The transaction has been initiated by the sender and is ready for the recipient to claim. This status is set when the recipient is already a registered user.",
    userAction: "No direct action for sender. Recipient needs to claim.",
    systemBehavior: "Backend has processed the sender's initiation and made funds available for recipient claim.",
    color: "text-blue-800",
    bgColor: "bg-blue-100",
  },
  pending_deposit: {
    label: "Awaiting Sender Deposit",
    description:
      "This status indicates that the system is awaiting confirmation of the initial bank transfer. This is part of the primary sender-initiated flow in the current system.",
    userAction: "Sender user need to send the initial tranfer",
    systemBehavior: "Backend monitors for deposit confirmation.",
    color: "text-yellow-800",
    bgColor: "bg-yellow-100",
  },
  pending_invite: {
    label: "Invitation Pending",
    description:
      "The recipient is not yet registered. An invitation has been sent to them to sign up and claim the remittance.",
    userAction: "No direct action for sender. Recipient needs to register.",
    systemBehavior: "System sends invitation email to recipient and waits for registration.",
    color: "text-purple-800",
    bgColor: "bg-purple-100",
  },
  pending_claim: {
    label: "Awaiting Claim",
    description:
      "The recipient needs to provide their bank details to receive the funds. This status is set after the sender's initiation (for existing recipients) or after the recipient registers (for invited recipients).",
    userAction: "Enter local bank account details for withdrawal.",
    systemBehavior: "System waits for recipient to submit claim information.",
    color: "text-orange-800",
    bgColor: "bg-orange-100",
  },
  claiming: {
    label: "Processing Claim",
    description: "The recipient's claim is being processed, and funds are being transferred to their bank account.",
    systemBehavior: "Backend processes the withdrawal to recipient's bank account.",
    color: "text-indigo-800",
    bgColor: "bg-indigo-100",
  },
  processing: {
    label: "Sending Payment",
    description: "Funds are being transferred to the bank account.",
    systemBehavior: "Backend processes the withdrawal to recipient's bank account.",
    color: "text-indigo-800",
    bgColor: "bg-indigo-100",
  },
  completed: {
    label: "Completed",
    description: "All transaction steps have been successfully finalized. Funds have been transferred to recipient.",
    systemBehavior: "Transaction is complete, funds have been transferred to recipient.",
    color: "text-green-800",
    bgColor: "bg-green-100",
  },
}

export function getStatusInfo(status: TransactionStatus): TransactionStatusInfo {
  return TRANSACTION_STATUSES[status]
}

export function getNextStatus(
  currentStatus: TransactionStatus,
  recipientRegistered: boolean,
): TransactionStatus | null {
  switch (currentStatus) {
    case "pending_user_start":
      return recipientRegistered ? "pending_invite" : "pending_deposit"      
    case "pending_invite":
      return "pending_deposit"
    case "pending_deposit":
      return "pending_claim"
    case "pending_claim":
      return "claiming"
    case "claiming":
      return "completed"
    case "completed":
      return null
    default:
      return null
  }
}

export function canUserTakeAction(status: TransactionStatus, userRole: "sender" | "recipient"): boolean {
  if (userRole === "sender") {
    // Sender has no direct action after initial send in this new flow
    return status === "pending_deposit"
  }

  if (userRole === "recipient") {
    return status === "pending_claim"
  }

  return false
}
