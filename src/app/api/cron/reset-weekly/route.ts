
import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp();
}

const adminDb = getFirestore();

/**
 * Weekly Reset Task (Cron: 0 0 * * 1)
 * Resets weeklyPoints for all users and updates the currentWeek identifier.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  // Security check: Only allow authorized cron triggers
  if (process.env.CRON_SECRET && key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    // Calculate the identifier for the current week (this Monday)
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    lastMonday.setHours(0, 0, 0, 0);
    const currentWeekStr = lastMonday.toISOString().split('T')[0];

    const usersSnap = await adminDb.collection('users').get();
    
    if (usersSnap.empty) {
      return NextResponse.json({ success: true, message: 'No users to process' });
    }

    // Process in batches of 500 (Firestore limit)
    let batch = adminDb.batch();
    let count = 0;
    let totalProcessed = 0;

    for (const doc of usersSnap.docs) {
      batch.update(doc.ref, { 
        weeklyPoints: 0,
        currentWeek: currentWeekStr
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

    console.log(`[Cron] Weekly reset successful. Processed ${totalProcessed} users.`);
    return NextResponse.json({ 
      success: true, 
      processed: totalProcessed,
      week: currentWeekStr
    });
  } catch (error) {
    console.error('[Cron] Weekly reset failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
