const TeacherDashboardPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Teacher Dashboard</h1>
      <p>
        Welcome, Teacher. This is your course management dashboard.
      </p>
      <div className="mt-6 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold">My Courses</h2>
        <p className="mt-2">
          The courses you are teaching will be listed here. You can create new courses and manage existing ones.
        </p>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;
