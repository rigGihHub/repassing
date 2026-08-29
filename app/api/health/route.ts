export async function GET() {
  return Response.json({status: 'ok', app: 'repassing', version: '0.1.0'});
}