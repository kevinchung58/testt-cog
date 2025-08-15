"use client";

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export const EnrollWithCodeForm = () => {
  const { getToken } = useAuth();
  const router = useRouter();
  const [courseCode, setCourseCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode.trim()) {
        setError("Please enter a course code.");
        return;
    }
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await fetch('/api/enrollments/code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ courseCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to enroll in course');
      }

      // Refresh the page to show the new course in the list
      router.refresh();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>Enroll with a Code</CardTitle>
            <CardDescription>Enter the course code provided by your teacher.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                <Input
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                    placeholder="COURSE-CODE"
                    className="font-mono"
                    disabled={loading}
                />
                <Button type="submit" disabled={loading}>
                    {loading ? 'Enrolling...' : 'Enroll'}
                </Button>
            </form>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </CardContent>
    </Card>
  );
};
