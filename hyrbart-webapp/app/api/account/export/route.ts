import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SANITY_PROJECT_ID = 'ew1i5o0v';
const SANITY_DATASET = 'production';
const SANITY_API_VERSION = '2026-09-08';

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

async function load(label: string, query: PromiseLike<QueryResult>) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
}

async function loadSanityListings(sanityProfileId: string | null | undefined) {
  if (!sanityProfileId) return [];

  const token = process.env.SANITY_API_READ_TOKEN;
  if (!token) throw new Error('Sanity read token is missing');

  const query = `*[_type == "product" && owner._ref == ${JSON.stringify(sanityProfileId)}]{
    _id,_createdAt,_updatedAt,brand,name,slug,typeSv,typeEn,category,images,badge,rating,reviewCount,
    dailyPrice,multiDayDiscountPercent,weeklyDiscountPercent,repeatCustomerDiscountPercent,
    cancellationPolicy,rentalPrices,included,description,specifications,guideSections,hyggloUrl,
    supplierUrl,translationTool,listingStatus,owner,pickupLocation
  }`;
  const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?query=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Sanity export query failed: ${response.status}`);
  const body = await response.json() as { result?: unknown[] };
  return body.result ?? [];
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, {
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const profile = await load('profile', supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()) as Record<string, unknown> | null;

    const bookings = await load('bookings', supabase
      .from('bookings')
      .select('*')
      .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)
      .order('created_at', { ascending: true })) as Array<Record<string, unknown>>;
    const bookingIds = bookings
      .map(row => typeof row.id === 'string' ? row.id : null)
      .filter((id): id is string => Boolean(id));

    const bookingScoped = async (table: string) => bookingIds.length
      ? load(table, supabase.from(table).select('*').in('booking_id', bookingIds))
      : [];

    const [
      favorites,
      externalReputationClaims,
      identityVerificationAttempts,
      identityVerificationEvents,
      listingImportAssets,
      listingImportBatches,
      listingImportConsents,
      listingImportItems,
      listingImportJobs,
      listingRentalRules,
      notificationChannelPreferences,
      notificationPreferenceAudit,
      notificationPreferences,
      privacyConsentEvents,
      privacyPreferences,
      profileFollows,
      searchAlerts,
      automatedMessageTemplates,
      automatedMessageTemplateAssets,
      automatedMessageTemplateListings,
      hostPickupLocations,
      hostReferrals,
      hostRevenueGoals,
      referralRewards,
      userNotifications,
      bookingReviews,
      reviewReports,
      pushSubscriptionMetadata,
      bookingMessages,
      bookingPayments,
      bookingPayouts,
      bookingLateReturns,
      bookingAgreements,
      bookingEvents,
      sanityListings,
    ] = await Promise.all([
      load('favorites', supabase.from('favorites').select('*').eq('user_id', user.id)),
      load('external_reputation_claims', supabase.from('external_reputation_claims').select('*').eq('user_id', user.id)),
      load('identity_verification_attempts', supabase.from('identity_verification_attempts').select('*').eq('user_id', user.id)),
      load('identity_verification_events', supabase.from('identity_verification_events').select('*').eq('user_id', user.id)),
      load('listing_import_assets', supabase.from('listing_import_assets').select('*').eq('user_id', user.id)),
      load('listing_import_batches', supabase.from('listing_import_batches').select('*').eq('user_id', user.id)),
      load('listing_import_consents', supabase.from('listing_import_consents').select('*').eq('user_id', user.id)),
      load('listing_import_items', supabase.from('listing_import_items').select('*').eq('user_id', user.id)),
      load('listing_import_jobs', supabase.from('listing_import_jobs').select('*').eq('user_id', user.id)),
      load('listing_rental_rules', supabase.from('listing_rental_rules').select('*').eq('owner_id', user.id)),
      load('notification_channel_preferences', supabase.from('notification_channel_preferences').select('*').eq('user_id', user.id)),
      load('notification_preference_audit', supabase.from('notification_preference_audit').select('*').eq('user_id', user.id)),
      load('notification_preferences', supabase.from('notification_preferences').select('*').eq('user_id', user.id)),
      load('privacy_consent_events', supabase.from('privacy_consent_events').select('*').eq('user_id', user.id)),
      load('privacy_preferences', supabase.from('privacy_preferences').select('*').eq('user_id', user.id)),
      load('profile_follows', supabase.from('profile_follows').select('*').or(`follower_id.eq.${user.id},followed_id.eq.${user.id}`)),
      load('search_alerts', supabase.from('search_alerts').select('*').eq('user_id', user.id)),
      load('automated_message_templates', supabase.from('automated_message_templates').select('*').eq('owner_id', user.id)),
      load('automated_message_template_assets', supabase.from('automated_message_template_assets').select('*').eq('owner_id', user.id)),
      load('automated_message_template_listings', supabase.from('automated_message_template_listings').select('*').eq('owner_id', user.id)),
      load('host_pickup_locations', supabase.from('host_pickup_locations').select('*').eq('user_id', user.id)),
      load('host_referrals', supabase.from('host_referrals').select('*').or(`inviter_user_id.eq.${user.id},referred_user_id.eq.${user.id}`)),
      load('host_revenue_goals', supabase.from('host_revenue_goals').select('*').eq('user_id', user.id)),
      load('referral_rewards', supabase.from('referral_rewards').select('*').eq('user_id', user.id)),
      load('user_notifications', supabase.from('user_notifications').select('*').eq('user_id', user.id)),
      load('booking_reviews', supabase.from('booking_reviews').select('*').or(`reviewer_id.eq.${user.id},reviewee_id.eq.${user.id}`)),
      load('review_reports', supabase.from('review_reports').select('*').eq('reporter_id', user.id)),
      load('push_subscriptions', supabase.from('push_subscriptions').select('id,user_id,user_agent,created_at,updated_at').eq('user_id', user.id)),
      bookingScoped('booking_messages'),
      bookingScoped('booking_payments'),
      bookingScoped('booking_payouts'),
      bookingScoped('booking_late_returns'),
      bookingScoped('booking_agreements'),
      bookingScoped('booking_events'),
      loadSanityListings(typeof profile?.sanity_profile_id === 'string' ? profile.sanity_profile_id : null),
    ]);

    const generatedAt = new Date().toISOString();
    const exportPayload = {
      exportVersion: 1,
      generatedAt,
      account: {
        id: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        confirmedAt: user.confirmed_at ?? null,
        userMetadata: user.user_metadata ?? {},
      },
      profile,
      listings: sanityListings,
      rentals: {
        bookings,
        messages: bookingMessages,
        payments: bookingPayments,
        payouts: bookingPayouts,
        lateReturns: bookingLateReturns,
        agreements: bookingAgreements,
        events: bookingEvents,
        reviews: bookingReviews,
        reportsSubmittedByYou: reviewReports,
      },
      preferences: {
        favorites,
        follows: profileFollows,
        searchAlerts,
        notifications: userNotifications,
        notificationPreferences,
        notificationChannelPreferences,
        notificationPreferenceAudit,
        privacyPreferences,
        privacyConsentEvents,
        pushSubscriptionMetadata,
      },
      hosting: {
        pickupLocations: hostPickupLocations,
        rentalRules: listingRentalRules,
        automatedMessageTemplates,
        automatedMessageTemplateAssets,
        automatedMessageTemplateListings,
        revenueGoals: hostRevenueGoals,
      },
      verificationAndImports: {
        identityVerificationAttempts,
        identityVerificationEvents,
        externalReputationClaims,
        listingImportAssets,
        listingImportBatches,
        listingImportConsents,
        listingImportItems,
        listingImportJobs,
      },
      referrals: {
        referrals: hostReferrals,
        rewards: referralRewards,
      },
      notes: [
        'This self-service export is scoped to data available to the currently authenticated account.',
        'Internal security, fraud, moderation and staff-only notes are not included in this self-service file.',
        'Push encryption keys and browser push authentication secrets are intentionally excluded.',
      ],
    };

    const date = generatedAt.slice(0, 10);
    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="hyrbart-data-${date}.json"`,
        'Cache-Control': 'no-store, private',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Account data export failed', error);
    return NextResponse.json({ error: 'Could not create account data export' }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
