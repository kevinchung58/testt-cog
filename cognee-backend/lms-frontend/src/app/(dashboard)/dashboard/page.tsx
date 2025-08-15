import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// This page acts as a router based on the user's role.
const DashboardRouterPage = () => {
  const { sessionClaims } = auth();

  const role = sessionClaims?.metadata.role;

  // Redirect users based on their role found in session claims.
  switch (role) {
    case "admin":
      redirect("/admin");
      break;
    case "teacher":
      redirect("/teacher");
      break;
    case "student":
      redirect("/student");
      break;
    default:
      // Fallback for users with no role or an unrecognized role.
      // You might want to redirect them to a generic page or show an error.
      // For now, we'll send them to a default student dashboard.
      console.log("User has no role or an unrecognized role, defaulting to student dashboard.");
      redirect("/student");
      break;
  }

  // This component should not render anything itself, as it always redirects.
  // Returning null is a good practice for components that don't render UI.
  return null;
};

export default DashboardRouterPage;
