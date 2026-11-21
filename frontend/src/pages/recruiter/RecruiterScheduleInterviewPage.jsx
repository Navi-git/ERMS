import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  MapPin,
  Users,
  Plus,
  Trash2,
  Send,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Building,
  UserCheck,
} from 'lucide-react';
import RecruiterLayout from '../../layouts/RecruiterLayout';
import applicationApi from '../../api/applicationApi';
import interviewApi from '../../api/interviewApi';
import { useToast } from '../../context/ToastContext';

export default function RecruiterScheduleInterviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [application, setApplication] = useState(null);

  // Form State
  const [interviewType, setInterviewType] = useState('technical');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [formatLocation, setFormatLocation] = useState('Google Meet Video');
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/tb-eval-demo');
  const [locationAddress, setLocationAddress] = useState('');

  // Date & Slot Selection
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedSlot, setSelectedSlot] = useState('01:00 PM');
  const [customTime, setCustomTime] = useState('');

  // Attendees State
  const [attendees, setAttendees] = useState([]);
  const [showAddExternal, setShowAddExternal] = useState(false);
  const [externalName, setExternalName] = useState('');
  const [externalEmail, setExternalEmail] = useState('');
  const [externalRole, setExternalRole] = useState('panelist');
  const [externalTitle, setExternalTitle] = useState('');

  // Invitation Note
  const [invitationNote, setInvitationNote] = useState('');

  useEffect(() => {
    fetchApplicationData();
  }, [id]);

  const fetchApplicationData = async () => {
    try {
      setLoading(true);
      const res = await applicationApi.getRecruiterApplicationDetail(id);
      setApplication(res.data);
      // Pre-populate invitation note template
      const candName = res.data?.candidate?.full_name || 'Candidate';
      setInvitationNote(
        `Hi ${candName},\n\nWe are looking forward to speaking with you for the upcoming round. Please ensure you have a quiet environment and have your design portfolio/projects ready to share.\n\nBest regards,\n${user?.full_name || 'Hiring Team'}`
      );
    } catch (err) {
      showToast('Failed to load applicant details.', 'error');
      navigate('/recruiter/applicants');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExternalPanelist = (e) => {
    e.preventDefault();
    if (!externalName.trim() || !externalEmail.trim()) {
      showToast('Name and email are required for external interviewers.', 'error');
      return;
    }
    const newAttendee = {
      id: `ext-${Date.now()}`,
      external_name: externalName.trim(),
      external_email: externalEmail.trim(),
      participant_role: externalRole,
      title: externalTitle.trim() || 'Guest Expert / Advisor',
      isExternal: true,
    };
    setAttendees([...attendees, newAttendee]);
    setExternalName('');
    setExternalEmail('');
    setExternalTitle('');
    setShowAddExternal(false);
    showToast(`Added ${newAttendee.external_name} to interview panel.`, 'success');
  };

  const handleRemoveAttendee = (attendeeId) => {
    setAttendees(attendees.filter((a) => a.id !== attendeeId));
  };

  const insertTemplateTag = (tag) => {
    setInvitationNote((prev) => `${prev} ${tag} `);
  };

  const calculateFullDateTime = () => {
    const timeToUse = customTime || selectedSlot;
    if (!selectedDate || !timeToUse) return null;

    // Convert "01:00 PM" to 24hr format
    const [time, modifier] = timeToUse.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
    hours = String(hours).padStart(2, '0');
    minutes = minutes || '00';

    return new Date(`${selectedDate}T${hours}:${minutes}:00`);
  };

  const handleSendInvitation = async () => {
    const fullDate = calculateFullDateTime();
    if (!fullDate || isNaN(fullDate.getTime())) {
      showToast('Please select a valid date and time slot.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const participantsPayload = attendees.map((a) => ({
        external_name: a.external_name,
        external_email: a.external_email,
        participant_role: a.participant_role,
        user_id: a.user_id || null,
      }));

      const payload = {
        application_id: Number(id),
        interview_type: interviewType,
        scheduled_at: fullDate.toISOString(),
        duration_minutes: Number(durationMinutes),
        meeting_link: formatLocation.includes('Video') ? meetingLink.trim() : null,
        location: formatLocation.includes('Video') ? formatLocation : (locationAddress.trim() || formatLocation),
        invitation_note: invitationNote.trim(),
        job_stage_id: application?.current_stage?.id || null,
        participants: participantsPayload,
      };

      const res = await interviewApi.scheduleInterview(payload);
      showToast('Interview scheduled and invitations dispatched!', 'success');
      if (res.data?.warnings && res.data.warnings.length > 0) {
        showToast(res.data.warnings[0], 'warning');
      }
      navigate(`/recruiter/interviews`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to schedule interview.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const suggestedSlots = [
    { start: '09:00 AM', end: '09:45 AM' },
    { start: '10:30 AM', end: '11:15 AM' },
    { start: '01:00 PM', end: '01:45 PM' },
    { start: '02:30 PM', end: '03:15 PM' },
    { start: '04:00 PM', end: '04:45 PM' },
  ];

  if (loading) {
    return (
      <RecruiterLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-[#0058be] border-t-transparent rounded-full animate-spin" />
        </div>
      </RecruiterLayout>
    );
  }

  const candidateName = application?.candidate?.full_name || 'Candidate';
  const jobTitle = application?.job?.title || 'Job';

  return (
    <RecruiterLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              to={`/recruiter/applications/${id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Candidate Profile</span>
            </Link>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Schedule Interview</h1>
            <p className="text-xs text-gray-500">Set up the next stage in the hiring process.</p>
          </div>

          {/* Candidate Mini Card */}
          <div className="flex items-center gap-3 p-2.5 pr-4 rounded-2xl bg-white border border-gray-200 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0058be] flex items-center justify-center font-bold text-sm">
              {candidateName.charAt(0)}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">{candidateName}</p>
              <p className="text-[11px] text-gray-500">
                Applying for: <span className="font-semibold text-gray-700">{jobTitle}</span>
              </p>
            </div>
            <span className="ml-2 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-[#0058be] border border-blue-100">
              {interviewType.toUpperCase()}
            </span>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: 4-Step Form */}
          <div className="lg:col-span-8 space-y-6">
            {/* Step 1: Interview Details */}
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#0058be] text-white flex items-center justify-center text-xs font-black">
                  1
                </div>
                <h2 className="text-base font-bold text-gray-900">Interview Details</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Interview Type */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Interview Type</label>
                  <select
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] bg-white cursor-pointer"
                  >
                    <option value="portfolio">Portfolio Review</option>
                    <option value="technical">Technical Interview</option>
                    <option value="phone">Phone Screen</option>
                    <option value="behavioral">Behavioral Interview</option>
                    <option value="final">Final Round</option>
                    <option value="on_site">On-Site Visit</option>
                    <option value="hr">HR Screening</option>
                  </select>
                </div>

                {/* Duration Chips */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Duration</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[30, 45, 60].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDurationMinutes(d)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          durationMinutes === d
                            ? 'bg-[#0058be] text-white border-[#0058be] shadow-xs'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {d}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location / Format */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Location / Format</label>
                  <select
                    value={formatLocation}
                    onChange={(e) => setFormatLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] bg-white cursor-pointer"
                  >
                    <option value="Google Meet Video">Google Meet Video</option>
                    <option value="Zoom Video">Zoom Video</option>
                    <option value="Phone Call">Phone Call</option>
                    <option value="On-Site HQ">On-Site Visit (HQ)</option>
                  </select>
                </div>
              </div>

              {/* Conditional Link or Address Input */}
              {formatLocation.includes('Video') ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-blue-600" />
                    Video Meeting Link
                  </label>
                  <input
                    type="url"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be]"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-600" />
                    Physical Address / Room
                  </label>
                  <input
                    type="text"
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    placeholder="550 Innovation Parkway, 4th Floor, Room 402..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be]"
                  />
                </div>
              )}
            </div>

            {/* Step 2: Select Date & Time */}
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#0058be] text-white flex items-center justify-center text-xs font-black">
                    2
                  </div>
                  <h2 className="text-base font-bold text-gray-900">Select Date & Time</h2>
                </div>
                <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Date Input */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    Select Date
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be]"
                  />
                  <p className="text-[11px] text-gray-500 mt-2">
                    Interviews are coordinated with panelists' calendars.
                  </p>
                </div>

                {/* Slots Selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    Suggested Slots for {selectedDate}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {suggestedSlots.map((slot) => {
                      const isSelected = selectedSlot === slot.start && !customTime;
                      return (
                        <button
                          key={slot.start}
                          type="button"
                          onClick={() => {
                            setSelectedSlot(slot.start);
                            setCustomTime('');
                          }}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#0058be] text-white border-[#0058be] ring-2 ring-[#0058be]/20'
                              : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-200'
                          }`}
                        >
                          <span className="block text-xs font-bold">{slot.start}</span>
                          <span
                            className={`block text-[10px] ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}
                          >
                            Ends {slot.end}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Attendees */}
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#0058be] text-white flex items-center justify-center text-xs font-black">
                    3
                  </div>
                  <h2 className="text-base font-bold text-gray-900">Attendees</h2>
                </div>
                <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {1 + attendees.length} Confirmed
                </span>
              </div>

              {/* Host Recruiter Card */}
              <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#0058be] text-white flex items-center justify-center font-bold text-xs uppercase">
                    {user?.full_name?.charAt(0) || 'R'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">{user?.full_name || 'Sarah Jenkins'} (You)</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-100 text-[#0058be]">
                        Team Lead
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">{user?.email || 'recruiter@company.com'} • Host</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Full Scorecard</span>
                </div>
              </div>

              {/* Panelists List */}
              {attendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className="p-3.5 rounded-xl border border-gray-200 bg-white flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      {attendee.external_name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">{attendee.external_name}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                          External Panelist
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        {attendee.external_email} • {attendee.title}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttendee(attendee.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Add Attendee Trigger or Form */}
              {!showAddExternal ? (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddExternal(true)}
                    className="px-4 py-2.5 rounded-xl border border-dashed border-gray-300 hover:border-[#0058be] text-xs font-bold text-[#0058be] hover:bg-blue-50/50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Invite External Panelist / Interviewer</span>
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleAddExternalPanelist}
                  className="p-4 rounded-xl border border-blue-200 bg-blue-50/20 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#0058be]" />
                      Add External Interviewer / Guest Advisor
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddExternal(false)}
                      className="text-xs text-gray-400 hover:text-gray-600 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-500">
                    External panelists receive an email invitation with calendar (.ics) attached. They do not require TalentBridge credentials.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={externalName}
                        onChange={(e) => setExternalName(e.target.value)}
                        placeholder="e.g. Dr. Aris Thorne"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={externalEmail}
                        onChange={(e) => setExternalEmail(e.target.value)}
                        placeholder="aris.thorne@partner-advisor.com"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Title / Role (Optional)</label>
                    <input
                      type="text"
                      value={externalTitle}
                      onChange={(e) => setExternalTitle(e.target.value)}
                      placeholder="e.g. Guest Domain Expert / Senior Systems Architect"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] bg-white"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#0058be] text-white text-xs font-bold hover:bg-[#004ca5] transition-colors shadow-xs cursor-pointer"
                    >
                      + Add External Interviewer
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Step 4: Invitation Note */}
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#0058be] text-white flex items-center justify-center text-xs font-black">
                    4
                  </div>
                  <h2 className="text-base font-bold text-gray-900">Invitation Note</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => insertTemplateTag('{Candidate_Name}')}
                    className="px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-[11px] font-semibold text-gray-700 transition-colors"
                  >
                    + Candidate Name
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTemplateTag('{Date_Time}')}
                    className="px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-[11px] font-semibold text-gray-700 transition-colors"
                  >
                    + Date & Time
                  </button>
                </div>
              </div>

              <textarea
                rows={4}
                value={invitationNote}
                onChange={(e) => setInvitationNote(e.target.value)}
                placeholder="Add special instructions, agendas, or portfolio expectations..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Right Column: Sticky Interview Summary */}
          <div className="lg:col-span-4 sticky top-6">
            <div className="rounded-3xl bg-[#001f4e] text-white p-6 shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-blue-300">
                  INTERVIEW SUMMARY
                </span>
                <h3 className="text-xl font-black text-white mt-1">Review & Dispatch</h3>
              </div>

              <div className="space-y-4 text-xs divide-y divide-blue-900/50">
                {/* Candidate */}
                <div className="pt-3 first:pt-0 space-y-1">
                  <span className="text-[11px] text-blue-300 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" /> Candidate
                  </span>
                  <p className="font-bold text-white text-sm">{candidateName}</p>
                </div>

                {/* Date & Time */}
                <div className="pt-3 space-y-1">
                  <span className="text-[11px] text-blue-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Date & Time
                  </span>
                  <p className="font-bold text-white">
                    {selectedDate} • {selectedSlot}
                  </p>
                  <p className="text-[11px] text-blue-200">{durationMinutes} mins duration</p>
                </div>

                {/* Format */}
                <div className="pt-3 space-y-1">
                  <span className="text-[11px] text-blue-300 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" /> Format & Stage
                  </span>
                  <p className="font-bold text-white capitalize">{interviewType} Interview</p>
                  <p className="text-[11px] text-blue-200 truncate">{formatLocation}</p>
                </div>

                {/* Attendees Summary */}
                <div className="pt-3 space-y-1">
                  <span className="text-[11px] text-blue-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Attendees ({1 + attendees.length})
                  </span>
                  <p className="font-semibold text-white">
                    {user?.full_name || 'Sarah Jenkins'} (Host)
                    {attendees.length > 0 && ` + ${attendees.length} panelist${attendees.length > 1 ? 's' : ''}`}
                  </p>
                </div>

                {/* Status */}
                <div className="pt-3 flex items-center justify-between">
                  <span className="text-[11px] text-blue-300">Status</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-900/80 text-blue-200 border border-blue-700">
                    Drafting
                  </span>
                </div>
              </div>

              {/* Primary Dispatch Action */}
              <button
                type="button"
                onClick={handleSendInvitation}
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-white hover:bg-blue-50 text-[#001f4e] font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#001f4e] border-t-transparent rounded-full animate-spin" />
                    <span>Dispatching Invites...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-[#0058be]" />
                    <span>Send Invitation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </RecruiterLayout>
  );
}
