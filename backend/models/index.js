const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company:      { type: String, required: true, trim: true },
  role:         { type: String, required: true, trim: true },
  type:         { type: String, enum: ['Internship','Full-time','Part-time','Contract','Freelance'], default: 'Internship' },
  location:     { type: String, trim: true },
  status:       { type: String, enum: ['saved','applied','interview','offered','rejected','ghosted','withdrawn'], default: 'applied' },
  statusHistory:[{ status: String, changedAt: { type: Date, default: Date.now }, source: { type: String, default: 'manual' }, note: String }],
  appliedDate:  Date,
  followUpDate: Date,
  deadlineDate: Date,
  lastActivityDate: { type: Date, default: Date.now },
  jobUrl:       String,
  linkedinUrl:  String,
  hrEmail:      String,
  hrName:       String,
  emailThreads: [{ gmailThreadId: String, subject: String, from: String, receivedAt: Date, snippet: String, aiSummary: String }],
  notes:        String,
  aiInsights:   String,
  salary:       String,
  priority:     { type: Number, min: 1, max: 5, default: 3 },
  tags:         [String],
  source:       { type: String, default: 'manual' },
  autoTracked:  { type: Boolean, default: false },
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  googleId:     { type: String, unique: true, sparse: true },
  email:        { type: String, required: true, unique: true },
  name:         String,
  picture:      String,
  googleTokens: { access_token: String, refresh_token: String, expiry_date: Number },
  gmailSyncEnabled: { type: Boolean, default: true },
  lastEmailSync: Date,
  syncKeywords: { type: [String], default: ['application received','thank you for applying','interview','offer letter','unfortunately','we regret','next steps','assessment','coding challenge','internship','position','hiring','recruiter','HR'] }
}, { timestamps: true });

const Application = mongoose.models.Application || mongoose.model('Application', applicationSchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = { Application, User };
