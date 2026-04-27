/**
 * Seva AI — Firestore Schema & Index Definitions
 *
 * This file documents every collection, its fields, and required composite
 * indexes. Use this as the source of truth for Firestore setup.
 *
 * Deploy indexes: firebase deploy --only firestore:indexes
 */

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION: reports
// Written by: ReporterPage (Frontend), Gemini Parser (Backend)
// ─────────────────────────────────────────────────────────────────────────────
const REPORT_SCHEMA = {
  id:                   'string (auto)',
  text:                 'string',              // Raw input from reporter
  summary:              'string',              // Gemini-generated 1-sentence summary
  type:                 'string',              // Selected category (food, medical, etc.)
  needType:             'string[]',            // Gemini-extracted: ['MEDICAL','WATER']
  severity:             'number (1-5)',
  urgencyScore:         'number (0-10)',       // Computed by Urgency Decay Engine
  zoneLabel:            "'CRITICAL'|'HIGH'|'MODERATE'|'LOW'|'RESOLVED'",
  zoneDensity:          'number (1.0|1.5|2.0)',// 1.0=rural, 1.5=urban, 2.0=slum
  weatherBonus:         'number',              // +0.5 rain, +1.0 heat, +1.5 flood
  repeatBonus:          'number',              // +1.0 per duplicate report
  status:               "'PENDING'|'PROCESSING'|'ASSIGNED'|'ON_ROUTE'|'RESOLVED'",
  reporterId:           'string (uid)',
  reporterName:         'string',
  location:             '{ lat: number, lng: number, address: string }',
  locationDescription:  'string',             // Gemini-extracted location text
  isLifeThreatening:    'boolean',
  detectedLanguage:     'string (ISO 639-1)', // e.g., 'hi', 'en'
  affectedCount:        'number',
  aiProcessed:          'boolean',
  aiProcessedAt:        'Timestamp',
  assignedVolunteerId:  'string (uid) | null',
  resourceGap:          'boolean',            // True if no volunteer was available
  matchCostKm:          'number',             // Cost from Hungarian Algorithm
  createdAt:            'Timestamp',
  updatedAt:            'Timestamp',
  meta: {
    imageUrl:           'string (Storage URL)',
    audioUrl:           'string (Storage URL)',
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION: volunteers
// Written by: Auth flow, Volunteer GPS updates (Frontend)
// ─────────────────────────────────────────────────────────────────────────────
const VOLUNTEER_SCHEMA = {
  id:                   'string (uid)',
  name:                 'string',
  email:                'string',
  role:                 "'VOLUNTEER'",
  skills:               'string[]',           // ['MEDICAL','RESCUE','FOOD']
  location:             '{ lat: number, lng: number }',
  online:               'boolean',
  currentMissionId:     'string | null',
  fcmToken:             'string',
  sevaPoints:           'number',             // Gamification
  completedMissions:    'number',
  createdAt:            'Timestamp',
  updatedAt:            'Timestamp',
};

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION: missions
// Written by: Swarm Assembler (Backend), Volunteers accepting tasks
// ─────────────────────────────────────────────────────────────────────────────
const MISSION_SCHEMA = {
  id:                   'string (auto)',
  reportId:             'string',
  volunteerId:          'string',
  volunteerName:        'string',
  location:             '{ lat: number, lng: number }',
  type:                 'string',             // Primary need type
  severity:             'number',
  urgencyScore:         'number',
  matchCostKm:          'number',
  algorithm:            "'HUNGARIAN_V2'",
  status:               "'PENDING'|'DISPATCHED'|'ON_ROUTE'|'COMPLETED'|'CANCELLED'",
  dispatchedAt:         'Timestamp | null',
  completedAt:          'Timestamp | null',
  adminId:              'string',
  createdAt:            'Timestamp',
  updatedAt:            'Timestamp',
};

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION: alerts
// Written by: Notification Service (Backend)
// ─────────────────────────────────────────────────────────────────────────────
const ALERT_SCHEMA = {
  id:                   'string (auto)',
  type:                 "'CRITICAL_ZONE'|'ESCALATION'|'RESOURCE_GAP'",
  reportId:             'string',
  urgencyScore:         'number',
  summary:              'string',
  location:             'string',
  recipientCount:       'number',
  successCount:         'number',
  sentAt:               'Timestamp',
};

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION: users
// Written by: Auth flow
// ─────────────────────────────────────────────────────────────────────────────
const USER_SCHEMA = {
  id:                   'string (uid)',
  name:                 'string',
  email:                'string',
  role:                 "'REPORTER'|'NGO_ADMIN'|'VOLUNTEER'|'GOVERNMENT'|'SUPER_ADMIN'",
  organization:         'string',
  fcmToken:             'string',
  createdAt:            'Timestamp',
};

// ─────────────────────────────────────────────────────────────────────────────
// REQUIRED FIRESTORE COMPOSITE INDEXES
// ─────────────────────────────────────────────────────────────────────────────
const INDEXES = [
  // Urgency Decay Engine — fetch open reports by status + urgency
  { collection: 'reports', fields: ['status', 'urgencyScore'], order: 'DESC' },
  // Swarm Assembler — fetch open reports sorted by urgency
  { collection: 'reports', fields: ['status', 'urgencyScore', 'createdAt'] },
  // Volunteer availability lookup
  { collection: 'volunteers', fields: ['online', 'currentMissionId'] },
  // Mission feed for volunteers
  { collection: 'missions', fields: ['status', 'createdAt'] },
  // Reports by reporter
  { collection: 'reports', fields: ['reporterId', 'createdAt'] },
];

module.exports = { REPORT_SCHEMA, VOLUNTEER_SCHEMA, MISSION_SCHEMA, ALERT_SCHEMA, USER_SCHEMA, INDEXES };
