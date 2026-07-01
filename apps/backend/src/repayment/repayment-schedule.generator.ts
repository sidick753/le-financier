interface GenerateScheduleParams {
  investmentId: string;
  fundingRequestId: string;
  amountCommitted: number;
  lockedReturn: number;
  durationMonths: number;
  category: string;
  startDate: Date;
}

interface ScheduleEntry {
  investmentId: string;
  fundingRequestId: string;
  dueDate: Date;
  amountDue: number;
  interestAmount: number;
  principalAmount: number;
  nature: 'INTEREST' | 'INSTALLMENT' | 'FINAL_PAYMENT';
}

export function generateSchedule(params: GenerateScheduleParams): ScheduleEntry[] {
  const { investmentId, fundingRequestId, amountCommitted, lockedReturn, durationMonths, category, startDate } = params;
  const entries: ScheduleEntry[] = [];

  if (category === 'FACTURE') {
    const monthlyRate = lockedReturn / 100 / 12;
    const interest = amountCommitted * monthlyRate * durationMonths;
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + durationMonths);

    entries.push({
      investmentId,
      fundingRequestId,
      dueDate,
      amountDue: amountCommitted + interest,
      interestAmount: interest,
      principalAmount: amountCommitted,
      nature: 'FINAL_PAYMENT',
    });
  } else if (category === 'PRET') {
    const monthlyRate = lockedReturn / 100 / 12;
    let remainingPrincipal = amountCommitted;

    // Formule standard amortissement constant : M = P * r / (1 - (1+r)^-n)
    const monthlyPayment = monthlyRate > 0
      ? amountCommitted * monthlyRate / (1 - Math.pow(1 + monthlyRate, -durationMonths))
      : amountCommitted / durationMonths;

    for (let month = 1; month <= durationMonths; month++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + month);

      const interestAmount = remainingPrincipal * monthlyRate;
      const principalAmount = Math.min(monthlyPayment - interestAmount, remainingPrincipal);
      remainingPrincipal = Math.max(0, remainingPrincipal - principalAmount);

      const nature = month === durationMonths ? 'FINAL_PAYMENT' : 'INSTALLMENT';

      entries.push({
        investmentId,
        fundingRequestId,
        dueDate,
        amountDue: month === durationMonths
          ? principalAmount + interestAmount + remainingPrincipal
          : monthlyPayment,
        interestAmount,
        principalAmount: month === durationMonths
          ? principalAmount + remainingPrincipal
          : principalAmount,
        nature,
      });
    }
  }

  return entries;
}
