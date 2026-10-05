import { prisma } from '../../lib/database.js';
import { sendTransactionalEmail } from '../../lib/email.js';
import type { VerificationSender } from '../auth/verification.service.js';

export async function sendBookingReceipt(id: string, send: VerificationSender = sendTransactionalEmail) {
  const now = new Date();
  const claimed = await prisma.booking.updateMany({
    where: { id, status: 'CONFIRMED', receiptStatus: { not: 'SENT' }, OR: [{ receiptAttemptAt: null }, { receiptAttemptAt: { lt: new Date(now.getTime() - 300000) } }] },
    data: { receiptStatus: 'SENDING', receiptAttemptAt: now },
  });
  if (!claimed.count) return;
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id }, include: { quote: true } });
  try {
    const a = booking.quote.pickup as { address: string }; const b = booking.quote.delivery as { address: string };
    await send({ to: booking.email, subject: `ODTC booking confirmed: ${booking.reference}`, text: `Your payment is confirmed.\nBooking: ${booking.reference}\nPickup: ${a.address}\nDelivery: ${b.address}\nFare: NGN ${booking.quote.totalFare.toFixed(2)}\nODTC will contact you about your delivery.` });
    await prisma.booking.update({ where: { id }, data: { receiptStatus: 'SENT' } });
  } catch {
    await prisma.booking.updateMany({ where: { id, receiptAttemptAt: now }, data: { receiptStatus: 'PENDING' } });
    console.error('Booking receipt delivery failed; queued for retry');
  }
}
export async function retryBookingReceipts() {
  const jobs = await prisma.booking.findMany({ where: { status: 'CONFIRMED', receiptStatus: { not: 'SENT' }, OR: [{ receiptAttemptAt: null }, { receiptAttemptAt: { lt: new Date(Date.now() - 300000) } }] }, select: { id: true }, take: 10, orderBy: { createdAt: 'asc' } });
  for (const job of jobs) await sendBookingReceipt(job.id);
}
