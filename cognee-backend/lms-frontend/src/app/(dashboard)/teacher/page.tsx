const TeacherDashboardPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Teacher Dashboard</h1>
      <p>
        Welcome, Teacher. This is your course management dashboard.
      </p>
      <div className="mt-6 p-4 border rounded-lg bg-gray-50">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">My Courses</h2>
            <a href="/teacher/create" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Create New Course
            </a>
        </div>
        <p className="mt-2">
          The courses you are teaching will be listed here.
        </p>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;
