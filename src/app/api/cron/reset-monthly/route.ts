
import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp();
}

const adminDb = getFirestore();

/**
 * Monthly Reset Task (Cron: 0 0 1 * *)
 * Resets monthlyPoints for all users and updates the currentMonth identifier.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  // Security check
  if (process.env.CRON_SECRET && key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    // Calculate the identifier for the current month (YYYY-MM)
    const currentMonthStr = now.toISOString().slice(0, 7);

    const usersSnap = await adminDb.collection('users').get();
    
    if (usersSnap.empty) {
      return NextResponse.json({ success: true, message: 'No users to process' });
    }

    let batch = adminDb.batch();
    let count = 0;
    let totalProcessed = 0;

    for (const doc of usersSnap.docs) {
      batch.update(doc.ref, { 
        monthlyPoints: 0,
        currentMonth: currentMonthStr
      });
      count++;
      totalProcessed++;

      if (count === 500) {
        await batch.commit();
        batch = adminDb.batch();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    console.log(`[Cron] Monthly reset successful. Processed ${totalProcessed} users.`);
    return NextResponse.json({ 
      success: true, 
      processed: totalProcessed,
      month: currentMonthStr
    });
  } catch (error) {
    console.error('[Cron] Monthly reset failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
