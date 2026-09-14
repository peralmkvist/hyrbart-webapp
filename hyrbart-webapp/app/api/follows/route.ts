import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyUser } from '@/lib/notifications';

const PUBLIC_PROFILE_FIELDS = 'id,display_name,city,avatar_url,bio,bankid_verified,account_status';

type PublicProfile = {
  id: string;
  display_name: string | null;
  city: string | null;
  avatar_url: string | null;
  bio: string | null;
  bankid_verified: boolean;
  account_status: string;
};

function publicProfile(profile: PublicProfile) {
  return {
    id: profile.id,
    displayName: profile.display_name || 'Hyrbart-användare',
    city: profile.city,
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    verified: profile.bankid_verified,
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const url = new URL(request.url);
  const target = url.searchParams.get('target');
  const mode = url.searchParams.get('mode') === 'followers' ? 'followers' : 'following';
  const admin = createAdminClient();

  if (target) {
    const [{ data: targetProfile }, { data: relation }, { count }] = await Promise.all([
      admin.from('profiles').select(PUBLIC_PROFILE_FIELDS).eq('id', target).eq('account_status', 'active').maybeSingle(),
      admin.from('profile_follows').select('follower_id').eq('follower_id', user.id).eq('followed_id', target).maybeSingle(),
      admin.from('profile_follows').select('follower_id', { count: 'exact', head: true }).eq('followed_id', target),
    ]);
    if (!targetProfile) return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ following: Boolean(relation), followerCount: count || 0, profile: publicProfile(targetProfile as PublicProfile) }, { headers: { 'cache-control': 'no-store' } });
  }

  const relationQuery = mode === 'followers'
    ? admin.from('profile_follows').select('follower_id,created_at').eq('followed_id', user.id).order('created_at', { ascending: false })
    : admin.from('profile_follows').select('followed_id,created_at').eq('follower_id', user.id).order('created_at', { ascending: false });
  const { data: relations, error } = await relationQuery;
  if (error) return NextResponse.json({ error: 'LOAD_FAILED' }, { status: 500 });

  const ids = (relations || []).map((row: any) => mode === 'followers' ? row.follower_id : row.followed_id);
  if (!ids.length) return NextResponse.json({ profiles: [], count: 0 }, { headers: { 'cache-control': 'no-store' } });

  const { data: profiles, error: profileError } = await admin.from('profiles').select(PUBLIC_PROFILE_FIELDS).in('id', ids).eq('account_status', 'active');
  if (profileError) return NextResponse.json({ error: 'LOAD_FAILED' }, { status: 500 });
  const profileById = new Map((profiles || []).map((profile: any) => [profile.id, profile as PublicProfile]));
  const ordered = ids.map(id => profileById.get(id)).filter((profile): profile is PublicProfile => Boolean(profile)).map(publicProfile);
  return NextResponse.json({ profiles: ordered, count: ordered.length }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const followedUserId = String(body.followedUserId || '');
  if (!followedUserId) return NextResponse.json({ error: 'FOLLOWED_USER_REQUIRED' }, { status: 400 });
  if (followedUserId === user.id) return NextResponse.json({ error: 'CANNOT_FOLLOW_SELF' }, { status: 400 });

  const admin = createAdminClient();
  const [{ data: target }, { data: follower }] = await Promise.all([
    admin.from('profiles').select(PUBLIC_PROFILE_FIELDS).eq('id', followedUserId).eq('account_status', 'active').maybeSingle(),
    admin.from('profiles').select('display_name').eq('id', user.id).eq('account_status', 'active').maybeSingle(),
  ]);
  if (!target) return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 });
  if (!follower) return NextResponse.json({ error: 'FOLLOWER_NOT_ACTIVE' }, { status: 403 });

  const { error } = await admin.from('profile_follows').insert({ follower_id: user.id, followed_id: followedUserId });
  if (error && error.code !== '23505') return NextResponse.json({ error: 'SAVE_FAILED' }, { status: 500 });
  const created = !error;

  if (created) {
    const name = follower.display_name || 'En Hyrbart-användare';
    await notifyUser({
      userId: followedUserId,
      type: 'follower',
      title: 'Ny följare',
      body: `${name} följer dig nu på Hyrbart.`,
      url: `/sv/profil/${user.id}`,
      eventKey: `follow:${user.id}:${followedUserId}`,
      metadata: { follower_id: user.id },
      sendEmail: false,
    }).catch(error => console.error('Follower notification failed', error));
  }

  const { count } = await admin.from('profile_follows').select('follower_id', { count: 'exact', head: true }).eq('followed_id', followedUserId);
  return NextResponse.json({ ok: true, following: true, created, followerCount: count || 0 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const followedUserId = String(body.followedUserId || '');
  if (!followedUserId) return NextResponse.json({ error: 'FOLLOWED_USER_REQUIRED' }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin.from('profile_follows').delete().eq('follower_id', user.id).eq('followed_id', followedUserId);
  if (error) return NextResponse.json({ error: 'SAVE_FAILED' }, { status: 500 });
  const { count } = await admin.from('profile_follows').select('follower_id', { count: 'exact', head: true }).eq('followed_id', followedUserId);
  return NextResponse.json({ ok: true, following: false, followerCount: count || 0 });
}
