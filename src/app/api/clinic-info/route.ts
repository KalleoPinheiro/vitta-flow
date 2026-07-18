import { getClinicInfo } from "@/lib/clinic-info";
import { handleRequest } from "@/lib/api-response";

export async function GET() {
  return handleRequest(async () => getClinicInfo());
}
