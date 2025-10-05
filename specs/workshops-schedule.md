# Workshop Scheduling System Specification

## Executive Summary

This document outlines the complete implementation plan for Casa Luma's workshop scheduling and RSVP management system. The solution leverages Notion as the primary database backend with a SvelteKit frontend integration, providing a seamless experience for both administrators managing events and guests making reservations.

## System Architecture

### Technology Stack
- **Backend Database**: Notion (via Notion API)
- **Frontend**: SvelteKit 
- **API Integration**: Notion SDK for JavaScript
- **RSVP Storage**: Notion Database (with optional local cache)
- **Deployment**: TBD (Vercel/Netlify recommended)

### Data Flow
```
Notion Databases → Notion API → SvelteKit API Routes → Frontend Components
                                         ↑
                                    RSVP Form Submissions
```

## Database Schema

### 1. Events Database

**Database Name**: `Casa Luma Events`

| Field Name | Type | Description | Required | Notes |
|------------|------|-------------|----------|-------|
| Event Name | Title | Primary identifier for the event | Yes | |
| Slug | Formula | URL-friendly version of name | Auto | `replaceAll(lower(prop("Event Name")), " ", "-")` |
| Event Type | Select | Workshop, Retreat, Class, etc. | Yes | Options: Workshop, Retreat, Yoga Class, Art Session, Other |
| Date | Date | Event date and time | Yes | Include time |
| End Date | Date | For multi-day events | No | |
| Description | Rich Text | Full event description | Yes | |
| Short Description | Text | Brief description for cards | Yes | Max 160 chars |
| Instructor | Person | Event facilitator | Yes | |
| Capacity | Number | Maximum attendees | Yes | |
| Current Attendees | Rollup | Count of confirmed RSVPs | Auto | |
| Available Spots | Formula | Capacity - Current Attendees | Auto | |
| Status | Select | Event status | Yes | Options: Draft, Published, Full, Cancelled, Completed |
| Registration Status | Select | RSVP availability | Yes | Options: Open, Closed, Waitlist |
| Price | Number | Cost in EUR | Yes | 0 for free events |
| Location | Select | Venue/Room | Yes | Options: Main Hall, Garden, Studio A, Studio B, Online |
| Featured Image | Files | Event thumbnail | No | |
| Gallery | Files | Additional images | No | |
| Tags | Multi-select | Event categories | No | Meditation, Yoga, Art, Music, etc. |
| Language | Select | Event language | Yes | Options: Spanish, English, Both |
| Requirements | Text | What attendees should bring | No | |
| Created | Created Time | Auto timestamp | Auto | |
| Updated | Last Edited Time | Auto timestamp | Auto | |

### 2. RSVPs Database

**Database Name**: `Casa Luma RSVPs`

| Field Name | Type | Description | Required | Notes |
|------------|------|-------------|----------|-------|
| RSVP ID | Title | Unique identifier | Auto | Format: `RSVP-{timestamp}-{random}` |
| Event | Relation | Link to Events DB | Yes | |
| Guest Name | Text | Attendee full name | Yes | |
| Email | Email | Contact email | Yes | |
| Phone | Phone | Contact number | No | |
| Number of Guests | Number | Party size | Yes | Default: 1 |
| Status | Select | RSVP status | Yes | Options: Confirmed, Waitlist, Cancelled, No-show |
| Payment Status | Select | For paid events | Conditional | Options: Pending, Paid, Refunded, N/A |
| Notes | Text | Special requests | No | |
| Dietary Restrictions | Multi-select | For catered events | No | |
| Source | Select | How they heard about us | No | Options: Website, Instagram, Friend, Other |
| Created At | Created Time | Submission timestamp | Auto | |
| Confirmed At | Date | When admin confirmed | No | |
| Check-in Status | Checkbox | Event day tracking | No | |
| Internal Notes | Text | Admin notes | No | |

### 3. Waitlist Database (Optional)

**Database Name**: `Casa Luma Waitlist`

| Field Name | Type | Description | Required |
|------------|------|-------------|----------|
| Waitlist ID | Title | Unique identifier | Auto |
| Event | Relation | Link to Events DB | Yes |
| Guest Name | Text | Attendee name | Yes |
| Email | Email | Contact email | Yes |
| Phone | Phone | Contact number | No |
| Added At | Created Time | When joined waitlist | Auto |
| Notified | Checkbox | If spot opened up | No |
| Converted to RSVP | Relation | Link to RSVP if converted | No |

## API Integration

### 1. Notion Setup

```typescript
// Environment Variables Required
NOTION_API_KEY=secret_xxx
NOTION_EVENTS_DB_ID=xxx
NOTION_RSVPS_DB_ID=xxx
NOTION_WAITLIST_DB_ID=xxx
```

### 2. Remote Functions Structure (SvelteKit Experimental)

**Note:** Using SvelteKit Remote Functions instead of traditional API routes for better type safety and less boilerplate.

```
src/lib/
├── workshops.remote.ts     # Public workshop queries and RSVP submission
└── admin/
    └── workshops.remote.ts # Admin CRUD operations (optional)
```

Remote functions provide:
- Full TypeScript type inference
- Automatic endpoint generation
- Built-in validation with Standard Schema (Valibot/Zod)
- Direct import and usage in components
- Server-only execution

### 3. Remote Functions Examples

```typescript
// workshops.remote.ts
import { query, form } from '$app/server';
import * as v from 'valibot';

// Fetch upcoming events
export const getUpcomingEvents = query(async () => {
  const response = await notion.databases.query({
    database_id: EVENTS_DB_ID,
    filter: {
      and: [
        {
          property: 'Date',
          date: { on_or_after: new Date().toISOString() }
        },
        {
          property: 'Status',
          select: { equals: 'Published' }
        }
      ]
    },
    sorts: [{ property: 'Date', direction: 'ascending' }]
  });
  return transformEvents(response.results);
});

// Get single event by slug
export const getEvent = query(
  v.string(),
  async (slug) => {
    // Query and return single event
  }
);

// Submit RSVP
export const submitRSVP = form(async (formData) => {
  const data = {
    guestName: formData.get('guestName'),
    email: formData.get('email'),
    // ... validate and process
  };
  
  await notion.pages.create({
    parent: { database_id: RSVPS_DB_ID },
    properties: { /* ... */ }
  });
  
  return { success: true };
});
```

**Usage in Components:**
```svelte
<script lang="ts">
  import { getUpcomingEvents } from '$lib/workshops.remote';
  
  // Direct await in component (requires experimental.async: true)
  const events = await getUpcomingEvents();
</script>

<ul>
  {#each events as event}
    <li>{event.eventName}</li>
  {/each}
</ul>
```

## Frontend Implementation

### 1. Page Structure

```
src/routes/
├── workshops/
│   ├── +page.svelte        # Workshop listing
│   ├── +page.server.ts     # Load events
│   └── [slug]/
│       ├── +page.svelte    # Event detail
│       └── +page.server.ts # Load single event
```

### 2. Components

```
src/lib/components/workshops/
├── EventCard.svelte        # Event preview card
├── EventCalendar.svelte    # Calendar view
├── EventList.svelte        # List view
├── RSVPForm.svelte         # Reservation form
├── EventFilters.svelte     # Filter by type/date
└── AvailabilityBadge.svelte # Spots remaining
```

### 3. Display Views

- **List View**: Card-based layout with filtering
- **Calendar View**: Monthly calendar with event dots
- **Detail View**: Full event information with RSVP form

## RSVP Form Implementation

### Form Fields
1. Full Name* (text)
2. Email* (email)
3. Phone (tel)
4. Number of Guests* (number, min=1, max=available spots)
5. Dietary Restrictions (checkboxes, if applicable)
6. Special Notes (textarea)
7. How did you hear about us? (select)
8. Accept Terms* (checkbox)

### Validation Rules
- Email format validation
- Phone number format (optional)
- Guest count cannot exceed available spots
- Duplicate email check for same event
- Rate limiting (max 3 submissions per IP per hour)

### Submission Flow
1. Client-side validation
2. Check available spots
3. Create RSVP in Notion
4. Send confirmation email (optional)
5. Update event attendee count
6. Handle waitlist if full

## Event Management Workflow

### For Administrators (via Notion)
1. **Create Event**: Add new page to Events database
2. **Set Status**: Draft → Published when ready
3. **Monitor RSVPs**: View related RSVPs
4. **Check-in**: Mark attendance on event day
5. **Post-event**: Change status to Completed

### For Guests (via Website)
1. Browse upcoming workshops
2. View event details
3. Check availability
4. Submit RSVP form
5. Receive confirmation
6. Get reminders (optional)

## Security Considerations

1. **API Keys**: Store in environment variables
2. **Rate Limiting**: Implement on RSVP endpoints
3. **Input Sanitization**: Clean all form inputs
4. **CORS**: Configure for production domain
5. **Data Privacy**: GDPR compliance for EU users

## Performance Optimization

1. **Caching Strategy**:
   - Cache event listings (5 min TTL)
   - Real-time availability checks
   - Static generation for past events

2. **Database Queries**:
   - Paginate large result sets
   - Filter at database level
   - Minimize API calls

3. **Frontend**:
   - Lazy load images
   - Skeleton loaders
   - Optimistic UI updates

## Error Handling

1. **API Errors**: Graceful fallbacks
2. **Network Issues**: Offline message
3. **Full Events**: Waitlist option
4. **Form Errors**: Clear user feedback

## Testing Strategy

1. **Unit Tests**: Form validation, utilities
2. **Integration Tests**: API routes
3. **E2E Tests**: Full RSVP flow
4. **Load Testing**: Concurrent submissions

## Deployment Checklist

- [ ] Set up Notion databases with schema
- [ ] Create Notion integration and get API key
- [ ] Share databases with integration
- [ ] Configure environment variables
- [ ] Implement API routes
- [ ] Build frontend components
- [ ] Add form validation
- [ ] Test RSVP flow
- [ ] Set up monitoring
- [ ] Deploy to production

## Future Enhancements

1. **Phase 2**:
   - Email notifications
   - Calendar sync (iCal)
   - QR code check-in
   - Recurring events

2. **Phase 3**:
   - Online payment integration
   - Multi-language support
   - Mobile app
   - Analytics dashboard

## Maintenance

- Weekly: Review upcoming events
- Monthly: Archive past events
- Quarterly: Database optimization
- Yearly: Schema review and updates

---

**Document Version**: 1.0  
**Last Updated**: October 2024  
**Author**: Casa Luma Development Team
