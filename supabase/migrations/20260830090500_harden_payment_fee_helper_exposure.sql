revoke all on function private.calculate_order_fee(uuid,text,text,bigint) from anon, authenticated;
grant execute on function private.calculate_order_fee(uuid,text,text,bigint) to service_role;
