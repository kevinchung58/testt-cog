const StudentDashboardPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Student Dashboard</h1>
      <p>
        Welcome, Student. This is your learning dashboard.
      </p>
      <div className="mt-6 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold">My Courses</h2>
        <p className="mt-2">
          Your enrolled courses will be listed here.
        </p>
      </div>
    </div>
  );
};

export default StudentDashboardPage;
