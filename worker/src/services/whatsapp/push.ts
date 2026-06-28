const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CURRENCY = "MYR";

export interface AddedExpense {
  id: number;
  name: string;
  amount: number;
}

/**
 * Sends a single Expo push notification summarising a batch of newly added
 * expenses. Best-effort: a missing token, empty list, or transport error is
 * logged and swallowed so it never breaks the WhatsApp confirmation flow.
 */
export async function sendExpenseAddedPush(
  pushToken: string | null | undefined,
  expenses: AddedExpense[],
): Promise<void> {
  if (!pushToken || expenses.length === 0) return;

  const count = expenses.length;
  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const noun = count === 1 ? "expense" : "expenses";

  const message = {
    to: pushToken,
    title: "Expenses added from WhatsApp",
    body: `${count} ${noun} · Total RM${totalAmount.toFixed(2)}`,
    data: {
      type: "EXPENSE_ADDED",
      count,
      expenses: expenses.map((e) => ({
        id: e.id,
        name: e.name,
        amount: Number(e.amount),
      })),
      totalAmount,
      currency: CURRENCY,
    },
  };

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(message),
    });
    if (!res.ok) {
      console.error("Expo push failed", res.status, await res.text());
    }
  } catch (err) {
    console.error("Expo push threw", err);
  }
}
