import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiFetch, clearSession, getToken, saveSession, setUnauthorizedHandler } from './api';
import {
  AttendanceRecord,
  AttendanceStatus,
  Batch,
  ClassSession,
  Dashboard,
  Enrollment,
  Exam,
  ExamResult,
  Student,
  User,
} from './types';

type Screen = 'today' | 'classes' | 'people' | 'more' | 'attendance' | 'exams' | 'results' | 'profile';
type AuthMode = 'login' | 'register';

function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, secondary && styles.secondaryButton, disabled && styles.disabledButton]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{label}</Text>
    </Pressable>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.kicker}>TUTIONFLOW</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function Loading() {
  return (
    <View style={styles.state}>
      <ActivityIndicator color="#2a9d8f" size="large" />
      <Text style={styles.stateText}>Loading TutionFlow...</Text>
    </View>
  );
}

function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <View style={styles.state}>
      <Text style={styles.errorTitle}>Could not load this view</Text>
      <Text style={styles.stateText}>{message}</Text>
      {retry ? <Button label="Try again" onPress={retry} secondary /> : null}
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.state}>
      <Text style={styles.emptyTitle}>{message}</Text>
      <Text style={styles.stateText}>Records from your workspace will appear here.</Text>
    </View>
  );
}

function Card({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.card}>
      {children}
    </Pressable>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionHeading}>{title}</Text>;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9aa8aa"
        secureTextEntry={secureTextEntry}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function Login({ onLogin, notice }: { onLogin: () => void; notice: string }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (notice) setError(notice);
  }, [notice]);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login'
        ? { email: email.trim(), password }
        : { email: email.trim(), password, fullName: fullName.trim(), role: 'TUTOR' };
      const result = await apiFetch<{ accessToken: string; refreshToken: string }>(path, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await saveSession(result.accessToken, result.refreshToken);
      onLogin();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to complete sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.auth} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.authTop}>
          <View style={styles.logo}><Text style={styles.logoText}>TF</Text></View>
          <Text style={styles.authBrand}>TutionFlow</Text>
          <Text style={styles.authTag}>Teaching, in your pocket.</Text>
        </View>
        <View style={styles.authForm}>
          <Text style={styles.kicker}>{mode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</Text>
          <Text style={styles.authTitle}>{mode === 'login' ? 'Sign in to your workspace' : 'Create your tutor account'}</Text>
          {mode === 'register' ? (
            <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your name" />
          ) : null}
          <Field
            autoCapitalize="none"
            keyboardType="email-address"
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
          />
          {error ? <Text accessibilityRole="alert" style={styles.formError}>{error}</Text> : null}
          <Button
            disabled={busy || !email.trim() || password.length < 8 || (mode === 'register' && fullName.trim().length < 2)}
            label={busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create tutor account'}
            onPress={() => { void submit(); }}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => { setError(''); setMode(mode === 'login' ? 'register' : 'login'); }}
            style={styles.authSwitch}
          >
            <Text style={styles.authSwitchText}>
              {mode === 'login' ? 'New to TutionFlow? Create an account' : 'Already have an account? Sign in'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function DashboardScreen({ data, navigate }: { data: Dashboard; navigate: (screen: Screen) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="Your teaching day" subtitle="Here is what needs your attention today." />
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>TODAY'S FOCUS</Text>
        <Text style={styles.heroTitle}>{data.todayClasses.length} classes on deck</Text>
        <Text style={styles.heroCopy}>
          {data.studentsNeedingAttention.length} student{data.studentsNeedingAttention.length === 1 ? '' : 's'} could use a check-in.
        </Text>
      </View>
      <View style={styles.metricGrid}>
        <Metric label="Active batches" value={`${data.metrics.activeBatches}`} />
        <Metric label="Students" value={`${data.metrics.totalStudents}`} />
        <Metric label="Attendance" value={`${data.metrics.attendance}%`} />
        <Metric label="Syllabus progress" value={`${data.metrics.syllabus.percentage}%`} />
        <Metric label="Exam average" value={`${data.metrics.examAverage}%`} />
      </View>
      <View style={styles.sectionRow}>
        <SectionTitle title="Today's classes" />
        <Pressable onPress={() => navigate('classes')}><Text style={styles.link}>See all</Text></Pressable>
      </View>
      {data.todayClasses.length ? data.todayClasses.map((item) => (
        <Card key={item.id}>
          <Text style={styles.time}>{formatTime(item.scheduledAt)}</Text>
          <Text style={styles.cardTitle}>{item.subject?.name ?? item.title ?? 'Class session'}</Text>
          <Text style={styles.cardMeta}>{item.topic?.title ?? 'General lesson'} · {item.batch.name}</Text>
        </Card>
      )) : <EmptyState message="No classes scheduled today." />}
      <View style={styles.sectionRow}>
        <SectionTitle title="Students to check in on" />
        <Pressable onPress={() => navigate('people')}><Text style={styles.link}>Students</Text></Pressable>
      </View>
      {data.studentsNeedingAttention.length ? data.studentsNeedingAttention.map((student) => (
        <Card key={student.id}>
          <Text style={styles.cardTitle}>{student.name}</Text>
          <Text style={styles.cardMeta}>{student.reasons.join(' · ')}</Text>
        </Card>
      )) : <EmptyState message="No student alerts right now." />}
      <View style={styles.sectionRow}>
        <SectionTitle title="Upcoming exams" />
        <Pressable onPress={() => navigate('exams')}><Text style={styles.link}>See all</Text></Pressable>
      </View>
      {data.upcomingExams.length ? data.upcomingExams.map((exam) => (
        <Card key={exam.id}>
          <Text style={styles.cardTitle}>{exam.title}</Text>
          <Text style={styles.cardMeta}>{exam.batch.name} · {dateLabel(exam.scheduledAt)} · {exam.totalMarks} marks</Text>
        </Card>
      )) : <EmptyState message="No upcoming exams." />}
    </ScrollView>
  );
}

function ClassesScreen() {
  const [items, setItems] = useState<ClassSession[] | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    const from = new Date();
    from.setDate(from.getDate() - 1);
    const to = new Date();
    to.setDate(to.getDate() + 14);
    try {
      setItems(await apiFetch<ClassSession[]>(`/api/sessions?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load classes.');
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="Classes" subtitle="Your scheduled sessions for the next two weeks." />
      {!items && !error ? <Loading /> : error ? <ErrorState message={error} retry={() => { void load(); }} /> : null}
      {items?.length === 0 ? <EmptyState message="No classes scheduled in this date range." /> : null}
      {items?.map((item) => (
        <Card key={item.id}>
          <Text style={styles.time}>{dateLabel(item.scheduledAt)} · {formatTime(item.scheduledAt)}</Text>
          <Text style={styles.cardTitle}>{item.subject?.name ?? item.title ?? 'Class session'}</Text>
          <Text style={styles.cardMeta}>{item.topic?.title ?? 'General lesson'} · {item.batch.name}</Text>
          <Text style={styles.status}>{item.status}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

function PeopleScreen() {
  const [tab, setTab] = useState<'students' | 'batches'>('students');
  const [students, setStudents] = useState<Student[] | null>(null);
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const [studentList, batchList] = await Promise.all([
        apiFetch<Student[]>('/api/students'),
        apiFetch<Batch[]>('/api/batches'),
      ]);
      setStudents(studentList);
      setBatches(batchList);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load students and batches.');
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="People" subtitle="Students and teaching groups in your workspace." />
      <View style={styles.segmentRow}>
        <Segment label="Students" active={tab === 'students'} onPress={() => setTab('students')} />
        <Segment label="Batches" active={tab === 'batches'} onPress={() => setTab('batches')} />
      </View>
      {!students || !batches ? error ? <ErrorState message={error} retry={() => { void load(); }} /> : <Loading /> : null}
      {tab === 'students' && students?.length === 0 ? <EmptyState message="No students added yet." /> : null}
      {tab === 'students' ? students?.map((student) => (
        <Card key={student.id}>
          <Text style={styles.cardTitle}>{student.user.fullName}</Text>
          <Text style={styles.cardMeta}>{student.user.email}</Text>
          <Text style={styles.cardMeta}>{student.enrollments.map((entry) => entry.batch.name).join(' · ') || 'Not enrolled in a batch'}</Text>
        </Card>
      )) : null}
      {tab === 'batches' && batches?.length === 0 ? <EmptyState message="No batches created yet." /> : null}
      {tab === 'batches' ? batches?.map((batch) => (
        <Card key={batch.id}>
          <Text style={styles.cardTitle}>{batch.name}</Text>
          <Text style={styles.cardMeta}>{batch.code} · {batch.academicYear}</Text>
          <Text style={styles.status}>{batch.status} · {batch._count?.enrollments ?? 0} students</Text>
        </Card>
      )) : null}
    </ScrollView>
  );
}

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.segment, active && styles.segmentActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function MoreScreen({ navigate, logout }: { navigate: (screen: Screen) => void; logout: () => void }) {
  const items: Array<[string, Screen]> = [
    ['Take attendance', 'attendance'],
    ['Exams', 'exams'],
    ['Exam results', 'results'],
    ['Profile', 'profile'],
  ];
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="More" subtitle="Teaching and account tools." />
      {items.map(([label, target]) => (
        <Pressable key={target} onPress={() => navigate(target)} style={styles.menuRow}>
          <Text style={styles.menuIcon}>{label.slice(0, 1)}</Text>
          <Text style={styles.menuText}>{label}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
      <Button label="Sign out" onPress={logout} secondary />
    </ScrollView>
  );
}

function AttendanceScreen() {
  const [sessions, setSessions] = useState<ClassSession[] | null>(null);
  const [selected, setSelected] = useState<ClassSession | null>(null);
  const [roster, setRoster] = useState<Enrollment[] | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadSessions() {
    setError('');
    const from = new Date();
    from.setDate(from.getDate() - 14);
    const to = new Date();
    to.setDate(to.getDate() + 14);
    try {
      setSessions(await apiFetch<ClassSession[]>(`/api/sessions?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load class sessions.');
    }
  }

  useEffect(() => { void loadSessions(); }, []);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    setRoster(null);
    setRecords([]);
    setStatuses({});
    setError('');
    Promise.all([
      apiFetch<Enrollment[]>(`/api/batches/${selected.batch.id}/students`),
      apiFetch<{ records: AttendanceRecord[] }>(`/api/attendance/sessions/${selected.id}`),
    ]).then(([enrollments, attendance]) => {
      if (!active) return;
      setRoster(enrollments);
      setRecords(attendance.records);
      const initial: Record<string, AttendanceStatus> = {};
      enrollments.forEach((entry) => {
        initial[entry.student.id] = attendance.records.find((record) => record.studentId === entry.student.id)?.status ?? 'PRESENT';
      });
      setStatuses(initial);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load the attendance roster.');
    });
    return () => { active = false; };
  }, [selected]);

  async function saveAttendance() {
    if (!selected || !roster) return;
    setBusy(true);
    setError('');
    try {
      const existing = new Map(records.map((record) => [record.studentId, record]));
      const newRecords = roster
        .filter((entry) => !existing.has(entry.student.id))
        .map((entry) => ({ studentId: entry.student.id, status: statuses[entry.student.id] }));
      const updates = roster.flatMap((entry) => {
        const record = existing.get(entry.student.id);
        return record && record.status !== statuses[entry.student.id]
          ? [apiFetch(`/api/attendance/${record.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: statuses[entry.student.id] }),
          })]
          : [];
      });
      if (newRecords.length) {
        await apiFetch(`/api/attendance/sessions/${selected.id}`, {
          method: 'POST',
          body: JSON.stringify({ records: newRecords }),
        });
      }
      await Promise.all(updates);
      Alert.alert('Attendance saved', 'The class attendance has been updated.');
      setSelected(null);
      await loadSessions();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save attendance.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="Attendance" subtitle={selected ? `${selected.batch.name} · ${dateLabel(selected.scheduledAt)}` : 'Choose a class session to mark its students.'} />
      {error ? <ErrorState message={error} retry={selected ? () => setSelected({ ...selected }) : () => { void loadSessions(); }} /> : null}
      {!selected ? (
        <>
          {!sessions && !error ? <Loading /> : null}
          {sessions?.length === 0 ? <EmptyState message="No class sessions in this date range." /> : null}
          {sessions?.map((session) => (
            <Card key={session.id} onPress={() => setSelected(session)}>
              <Text style={styles.time}>{dateLabel(session.scheduledAt)} · {formatTime(session.scheduledAt)}</Text>
              <Text style={styles.cardTitle}>{session.subject?.name ?? session.title ?? 'Class session'}</Text>
              <Text style={styles.cardMeta}>{session.batch.name}</Text>
              <Text style={styles.link}>Mark attendance</Text>
            </Card>
          ))}
        </>
      ) : (
        <>
          <Button label="Back to sessions" onPress={() => setSelected(null)} secondary />
          {!roster && !error ? <Loading /> : null}
          {roster?.length === 0 ? <EmptyState message="There are no enrolled students in this batch." /> : null}
          {roster?.map((entry) => (
            <Card key={entry.student.id}>
              <Text style={styles.cardTitle}>{entry.student.user.fullName}</Text>
              <View style={styles.statusRow}>
                {(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const).map((status) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: statuses[entry.student.id] === status }}
                    key={status}
                    onPress={() => setStatuses((current) => ({ ...current, [entry.student.id]: status }))}
                    style={[styles.statusChoice, statuses[entry.student.id] === status && styles.statusChoiceActive]}
                  >
                    <Text style={[styles.statusChoiceText, statuses[entry.student.id] === status && styles.statusChoiceTextActive]}>{status}</Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          ))}
          {roster?.length ? <Button disabled={busy} label={busy ? 'Saving...' : 'Save attendance'} onPress={() => { void saveAttendance(); }} /> : null}
        </>
      )}
    </ScrollView>
  );
}

function ExamsScreen({ resultsOnly = false }: { resultsOnly?: boolean }) {
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [selected, setSelected] = useState<Exam | null>(null);
  const [roster, setRoster] = useState<Enrollment[] | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadExams() {
    setError('');
    try {
      setExams(await apiFetch<Exam[]>('/api/exams'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load exams.');
    }
  }

  useEffect(() => { void loadExams(); }, []);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    setRoster(null);
    setError('');
    Promise.all([
      apiFetch<Enrollment[]>(`/api/batches/${selected.batchId}/students`),
      apiFetch<{ results: ExamResult[] }>(`/api/exams/${selected.id}/results`),
    ]).then(([enrollments, response]) => {
      if (!active) return;
      setRoster(enrollments);
      setResults(response.results);
      const initial: Record<string, string> = {};
      response.results.forEach((result) => {
        initial[result.studentId] = result.marksObtained === null ? '' : String(result.marksObtained);
      });
      setMarks(initial);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load exam results.');
    });
    return () => { active = false; };
  }, [selected]);

  async function saveResults() {
    if (!selected || !roster) return;
    setBusy(true);
    setError('');
    try {
      const existing = new Map(results.map((result) => [result.studentId, result]));
      const pending = roster.flatMap((entry) => {
        const value = marks[entry.student.id]?.trim();
        if (!value) return [];
        const parsedMarks = Number(value);
        if (!Number.isFinite(parsedMarks) || parsedMarks < 0 || parsedMarks > selected.totalMarks) {
          throw new Error(`Marks for ${entry.student.user.fullName} must be between 0 and ${selected.totalMarks}.`);
        }
        return [{ entry, result: existing.get(entry.student.id), parsedMarks }];
      });
      if (!pending.length) throw new Error('Enter marks for at least one student before saving.');
      await Promise.all(pending.map(({ entry, result, parsedMarks }) => apiFetch(
        result ? `/api/exams/${selected.id}/results/${result.id}` : `/api/exams/${selected.id}/results`,
        {
          method: result ? 'PATCH' : 'POST',
          body: JSON.stringify(result
            ? { marksObtained: parsedMarks }
            : { studentId: entry.student.id, marksObtained: parsedMarks }),
        },
      )));
      Alert.alert('Results saved', 'The exam marks have been updated.');
      setSelected(null);
      await loadExams();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save exam results.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header
        title={resultsOnly ? 'Exam results' : 'Exams'}
        subtitle={selected ? `${selected.batch.name} · ${selected.totalMarks} total marks` : 'Select an exam to review or enter marks.'}
      />
      {error ? <ErrorState message={error} retry={selected ? () => setSelected({ ...selected }) : () => { void loadExams(); }} /> : null}
      {!selected ? (
        <>
          {!exams && !error ? <Loading /> : null}
          {exams?.length === 0 ? <EmptyState message="No exams have been created yet." /> : null}
          {exams?.map((exam) => (
            <Card key={exam.id} onPress={() => setSelected(exam)}>
              <Text style={styles.time}>{dateLabel(exam.scheduledAt)}</Text>
              <Text style={styles.cardTitle}>{exam.title}</Text>
              <Text style={styles.cardMeta}>{exam.batch.name} · {exam.totalMarks} marks</Text>
              <Text style={styles.status}>{exam.results.length} results recorded</Text>
              <Text style={styles.link}>{resultsOnly ? 'Review results' : 'Enter marks'}</Text>
            </Card>
          ))}
        </>
      ) : (
        <>
          <Button label="Back to exams" onPress={() => setSelected(null)} secondary />
          {!roster && !error ? <Loading /> : null}
          {roster?.length === 0 ? <EmptyState message="There are no enrolled students in this batch." /> : null}
          {roster?.map((entry) => {
            const result = results.find((item) => item.studentId === entry.student.id);
            return (
              <Card key={entry.student.id}>
                <Text style={styles.cardTitle}>{entry.student.user.fullName}</Text>
                {result ? <Text style={styles.cardMeta}>Current result: {result.marksObtained ?? 'Not marked'} / {selected.totalMarks}</Text> : null}
                <TextInput
                  accessibilityLabel={`Marks for ${entry.student.user.fullName}`}
                  keyboardType="number-pad"
                  onChangeText={(value) => setMarks((current) => ({ ...current, [entry.student.id]: value.replace(/[^0-9.]/g, '') }))}
                  placeholder={`Marks out of ${selected.totalMarks}`}
                  placeholderTextColor="#9aa8aa"
                  style={styles.input}
                  value={marks[entry.student.id] ?? ''}
                />
              </Card>
            );
          })}
          {roster?.length ? <Button disabled={busy} label={busy ? 'Saving...' : 'Save results'} onPress={() => { void saveResults(); }} /> : null}
        </>
      )}
    </ScrollView>
  );
}

function ProfileScreen({ user, logout }: { user: User | null; logout: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="Profile" subtitle="Your tutor account." />
      {user ? (
        <Card>
          <Text style={styles.cardTitle}>{user.fullName}</Text>
          <Text style={styles.cardMeta}>{user.email}</Text>
          <Text style={styles.cardMeta}>{user.phone || 'No phone number added'}</Text>
          <Text style={styles.status}>{user.role}</Text>
        </Card>
      ) : <EmptyState message="Profile details are not available." />}
      <Button label="Sign out" onPress={logout} secondary />
    </ScrollView>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={styles.tab}>
      <Text style={[styles.tabLabel, active && styles.tabActive]}>{label}</Text>
    </Pressable>
  );
}

export default function MobileApp() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [screen, setScreen] = useState<Screen>('today');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [authNotice, setAuthNotice] = useState('');

  async function loadDashboard() {
    setError('');
    try {
      const [dashboardData, userData] = await Promise.all([
        apiFetch<Dashboard>('/api/dashboard'),
        apiFetch<User>('/api/auth/me'),
      ]);
      setDashboard(dashboardData);
      setUser(userData);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load your workspace.');
    }
  }

  useEffect(() => {
    getToken().then((token) => {
      setAuthenticated(Boolean(token));
      setCheckingSession(false);
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Unable to check your saved session.');
      setCheckingSession(false);
    });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthNotice('Your session expired. Please sign in again.');
      setAuthenticated(false);
      setDashboard(null);
      setUser(null);
      setScreen('today');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (authenticated) void loadDashboard();
  }, [authenticated]);

  async function logout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // The local session still needs to be removed if the API is offline.
    } finally {
      await clearSession();
      setAuthenticated(false);
      setDashboard(null);
      setUser(null);
      setScreen('today');
    }
  }

  const content = useMemo(() => {
    if (!authenticated) return null;
    if (screen === 'today') {
      if (dashboard) return <DashboardScreen data={dashboard} navigate={setScreen} />;
      return error ? <ErrorState message={error} retry={() => { void loadDashboard(); }} /> : <Loading />;
    }
    if (screen === 'classes') return <ClassesScreen />;
    if (screen === 'people') return <PeopleScreen />;
    if (screen === 'attendance') return <AttendanceScreen />;
    if (screen === 'exams') return <ExamsScreen />;
    if (screen === 'results') return <ExamsScreen resultsOnly />;
    if (screen === 'profile') return <ProfileScreen user={user} logout={() => { void logout(); }} />;
    return <MoreScreen navigate={setScreen} logout={() => { void logout(); }} />;
  }, [authenticated, dashboard, error, screen, user]);

  if (checkingSession) return <SafeAreaView style={styles.app}><Loading /></SafeAreaView>;
  if (!authenticated) {
    return (
      <SafeAreaView style={styles.app}>
        <StatusBar style="dark" />
        <Login onLogin={() => { setError(''); setAuthNotice(''); setAuthenticated(true); }} notice={authNotice} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      {content}
      <View style={styles.tabBar}>
        <Tab label="Today" active={screen === 'today'} onPress={() => setScreen('today')} />
        <Tab label="Classes" active={screen === 'classes'} onPress={() => setScreen('classes')} />
        <Tab label="People" active={screen === 'people'} onPress={() => setScreen('people')} />
        <Tab label="More" active={screen === 'more' || ['attendance', 'exams', 'results', 'profile'].includes(screen)} onPress={() => setScreen('more')} />
      </View>
    </SafeAreaView>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#f5f7f4' },
  content: { padding: 20, paddingBottom: 105 },
  header: { paddingTop: 10, paddingBottom: 22 },
  kicker: { color: '#2a9d8f', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#183642', fontSize: 29, fontWeight: '500', marginTop: 4 },
  subtitle: { color: '#77898c', fontSize: 13, marginTop: 5 },
  state: { minHeight: 180, alignItems: 'center', justifyContent: 'center', padding: 25, gap: 9 },
  stateText: { color: '#829294', textAlign: 'center', fontSize: 13 },
  errorTitle: { color: '#b55e43', fontSize: 17, fontWeight: '700' },
  emptyTitle: { color: '#46666b', fontSize: 17, fontWeight: '600' },
  button: { backgroundColor: '#ef8354', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  secondaryButton: { backgroundColor: '#e4f2ef' },
  secondaryButtonText: { color: '#277c70' },
  disabledButton: { opacity: 0.55 },
  hero: { backgroundColor: '#173b43', borderRadius: 14, padding: 22, marginBottom: 14 },
  heroKicker: { color: '#9bd0c7', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  heroTitle: { color: '#fff', fontSize: 25, marginTop: 10, fontWeight: '600' },
  heroCopy: { color: '#b5cdca', fontSize: 13, marginTop: 7 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 20 },
  metric: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e9e7', borderRadius: 9, padding: 14, width: '48%' },
  metricLabel: { color: '#829294', fontSize: 11 },
  metricValue: { color: '#183642', fontSize: 23, marginTop: 8, fontWeight: '600' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 9 },
  sectionHeading: { color: '#183642', fontSize: 19, fontWeight: '600' },
  link: { color: '#2a9d8f', fontSize: 12, fontWeight: '700', marginTop: 10 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e9e7', borderRadius: 10, padding: 16, marginBottom: 9 },
  cardTitle: { color: '#183642', fontSize: 15, fontWeight: '700' },
  cardMeta: { color: '#829294', fontSize: 12, marginTop: 5 },
  time: { color: '#ef8354', fontSize: 12, fontWeight: '700', marginBottom: 5 },
  status: { alignSelf: 'flex-start', color: '#2a9d8f', backgroundColor: '#e4f2ef', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 4, fontSize: 10, fontWeight: '700', marginTop: 10, overflow: 'hidden' },
  segmentRow: { flexDirection: 'row', backgroundColor: '#e7eeeb', padding: 4, borderRadius: 9, marginBottom: 15 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 7 },
  segmentActive: { backgroundColor: '#fff' },
  segmentText: { color: '#718487', fontSize: 13, fontWeight: '600' },
  segmentTextActive: { color: '#183642' },
  menuRow: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#edf1ef', padding: 17, flexDirection: 'row', alignItems: 'center' },
  menuIcon: { color: '#2a9d8f', fontWeight: '800', width: 30 },
  menuText: { color: '#183642', fontSize: 15, flex: 1 },
  chevron: { color: '#7e9897', fontSize: 25 },
  tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 72, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e1e9e7', flexDirection: 'row', justifyContent: 'space-around', paddingTop: 13 },
  tab: { alignItems: 'center', minWidth: 68 },
  tabLabel: { color: '#819294', fontSize: 12, fontWeight: '600' },
  tabActive: { color: '#2a9d8f', fontWeight: '800' },
  auth: { flex: 1 },
  authScroll: { flexGrow: 1, paddingBottom: 25 },
  authTop: { backgroundColor: '#173b43', padding: 35, paddingTop: 55, minHeight: 260 },
  logo: { width: 45, height: 45, borderRadius: 11, backgroundColor: '#ef8354', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontWeight: '900' },
  authBrand: { color: '#fff', fontSize: 29, marginTop: 24, fontWeight: '600' },
  authTag: { color: '#a8c4c2', fontSize: 14, marginTop: 8 },
  authForm: { backgroundColor: '#fff', margin: 20, marginTop: -35, borderRadius: 12, padding: 22 },
  authTitle: { color: '#183642', fontSize: 23, marginTop: 8, marginBottom: 14, fontWeight: '600' },
  fieldLabel: { color: '#587078', fontSize: 12, fontWeight: '700', marginBottom: 7, marginTop: 13 },
  input: { borderWidth: 1, borderColor: '#d8e3e1', borderRadius: 7, padding: 13, color: '#183642', fontSize: 14, marginTop: 10, backgroundColor: '#fff' },
  formError: { color: '#a55038', backgroundColor: '#fce8df', padding: 10, borderRadius: 6, marginTop: 14, fontSize: 12 },
  authSwitch: { paddingVertical: 14, alignItems: 'center' },
  authSwitchText: { color: '#277c70', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  statusChoice: { borderWidth: 1, borderColor: '#d8e3e1', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 9 },
  statusChoiceActive: { borderColor: '#2a9d8f', backgroundColor: '#e4f2ef' },
  statusChoiceText: { color: '#718487', fontSize: 10, fontWeight: '700' },
  statusChoiceTextActive: { color: '#277c70' },
});
