"use client";

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';

interface EnrollButtonProps {
  courseId: string;
}

export const EnrollButton = ({ courseId }: EnrollButtonProps) => {
  const { getToken, userId } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnroll = async () => {
    if (!userId) {
      // Redirect to sign-in if user is not logged in
      router.push('/sign-in');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to enroll in course');
      }

      // On success, redirect to the student dashboard where they'll see their new course
      router.push('/student');

    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button onClick={handleEnroll} disabled={loading} className="w-full mt-4">
        {loading ? 'Enrolling...' : 'Enroll Now'}
      </Button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
};
