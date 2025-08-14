import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {

  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    })
  }

  const eventType = evt.type;

  // Specifically handle the user.created event
  if (eventType === 'user.created') {
    const { id } = evt.data;

    if (!id) {
        return new Response('Error: Missing user ID in webhook payload', { status: 400 });
    }

    try {
      // Set the default role for the new user to "student"
      await clerkClient.users.updateUserMetadata(id, {
        publicMetadata: {
          role: 'student'
        }
      });
      console.log(`User ${id} has been assigned the default role of 'student'.`);
      return new Response('User role updated successfully', { status: 201 });
    } catch (err) {
      console.error('Error updating user metadata:', err);
      return new Response('Error occured while setting user role', {
        status: 500
      })
    }
  }

  console.log(`Webhook with an event type of ${eventType} received, but no action was taken.`);

  return new Response('', { status: 200 })
}
