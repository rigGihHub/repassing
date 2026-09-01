import {NextResponse} from 'next/server';
import {createSupabaseServerClient} from '@/src/shared/supabase/server';

const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {data: {user}} = await supabase.auth.getUser();
    if (!user) return NextResponse.json({error: 'UNAUTHORIZED'}, {status: 401});

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({error: 'INVALID_INPUT'}, {status: 400});

    const organizationName = clean(body.clubName, 120);
    const contactName = clean(body.contactName, 120);
    const contactEmail = clean(body.contactEmail, 254).toLowerCase();
    const website = clean(body.website, 300);
    const city = clean(body.city, 120);
    const note = clean(body.note, 1000);

    if (organizationName.length < 2 || contactName.length < 2 || !emailPattern.test(contactEmail)) {
      return NextResponse.json({error: 'INVALID_INPUT'}, {status: 400});
    }
    if (website && !/^https?:\/\//i.test(website)) {
      return NextResponse.json({error: 'INVALID_WEBSITE'}, {status: 400});
    }

    const {data: existing, error: existingError} = await supabase
      .from('organization_applications')
      .select('id,status')
      .eq('applicant_user_id', user.id)
      .ilike('organization_name', organizationName)
      .in('status', ['SUBMITTED', 'PENDING'])
      .limit(1);

    if (existingError) throw existingError;
    if ((existing ?? []).length > 0) {
      return NextResponse.json({error: 'DUPLICATE_APPLICATION'}, {status: 409});
    }

    const notes = [
      city ? `Ort: ${city}` : '',
      website ? `Webbplats: ${website}` : '',
      note
    ].filter(Boolean).join('\n');

    const {data, error} = await supabase
      .from('organization_applications')
      .insert({
        applicant_user_id: user.id,
        organization_name: organizationName,
        country_code: 'SE',
        sport_codes: [],
        contact_name: contactName,
        contact_email: contactEmail,
        notes: notes || null,
        status: 'SUBMITTED'
      })
      .select('id,status')
      .single();

    if (error) throw error;
    return NextResponse.json({application: data}, {status: 201});
  } catch (error) {
    console.error('organization application failed', error);
    return NextResponse.json({error: 'APPLICATION_FAILED'}, {status: 500});
  }
}
