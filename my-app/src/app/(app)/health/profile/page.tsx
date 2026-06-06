import { getProfile } from "@/features/health/profile/actions";
import { ProfileForm } from "@/features/health/profile/profile-form";

export default async function ProfilePage() {
  const profile = await getProfile();

  return <ProfileForm profile={profile} />;
}
