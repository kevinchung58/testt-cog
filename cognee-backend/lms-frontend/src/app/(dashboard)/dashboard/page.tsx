import { UserButton } from "@clerk/nextjs";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p>Welcome to your dashboard. You are successfully signed in.</p>
      <div className="mt-4">
        <UserButton afterSignOutUrl="/" />
      </div>
    </div>
  );
}
