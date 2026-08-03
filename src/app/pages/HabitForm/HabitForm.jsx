import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiArrowLeft, FiArrowRight, FiBell, FiCheck, FiFlag, FiMinus, FiPlus } from "react-icons/fi";
import { Link, useNavigate, useParams } from "react-router-dom";
import HabitIcon from "../../components/HabitIcon/HabitIcon.jsx";
import QueryState from "../../components/QueryState/QueryState.jsx";
import { useCreateHabit, useHabit, useUpdateHabit } from "../../hooks/useHabitData.js";
import { addDays, toDateKey, weekdayLabel } from "../../utils/dateUtils.js";
import { describeSchedule, describeTarget, HABIT_COLORS, HABIT_ICONS } from "../../utils/habitUtils.js";
import "./HabitForm.css";

const steps = ["Habit", "Rhythm", "Support", "Review"];

function defaultForm() {
	return {
		name: "",
		description: "",
		mode: "build",
		metricType: "binary",
		targetValue: 1,
		unit: "times",
		color: HABIT_COLORS[0],
		icon: HABIT_ICONS[0],
		startDate: toDateKey(),
		schedule: { cadence: "daily", interval: 1, weekdays: [1, 3, 5], monthDay: 1, times: ["08:00"] },
		reminders: { enabled: true, emailFallback: true, privateCopy: false },
		milestone: { enabled: false, type: "count", targetValue: 7, dueDate: toDateKey(addDays(new Date(), 30)), rewardText: "", consequenceText: "" },
	};
}

export default function HabitForm() {
	const { habitId } = useParams();
	const editing = Boolean(habitId);
	const habitQuery = useHabit(habitId);

	if (editing && habitQuery.isLoading) return <QueryState isLoading />;
	if (editing && habitQuery.error) return <QueryState error={habitQuery.error} onRetry={habitQuery.refetch} />;

	return <HabitFormEditor habitId={habitId} initialHabit={habitQuery.data} />;
}

function HabitFormEditor({ habitId, initialHabit }) {
	const editing = Boolean(habitId);
	const createHabit = useCreateHabit();
	const updateHabit = useUpdateHabit();
	const navigate = useNavigate();
	const [step, setStep] = useState(0);
	const [form, setForm] = useState(() => initialHabit
		? { ...defaultForm(), ...initialHabit, milestone: defaultForm().milestone }
		: defaultForm());
	const [error, setError] = useState("");

	const previewHabit = useMemo(() => ({ ...form, id: habitId || "preview" }), [form, habitId]);
	const saving = createHabit.isPending || updateHabit.isPending;

	function update(field, value) {
		setForm((current) => ({ ...current, [field]: value }));
	}

	function updateSchedule(field, value) {
		setForm((current) => ({ ...current, schedule: { ...current.schedule, [field]: value } }));
	}

	function updateReminder(field, value) {
		setForm((current) => ({ ...current, reminders: { ...current.reminders, [field]: value } }));
	}

	function updateMilestone(field, value) {
		setForm((current) => ({ ...current, milestone: { ...current.milestone, [field]: value } }));
	}

	function validateStep() {
		if (step === 0 && form.name.trim().length < 2) return "Give the habit a short, clear name.";
		if (step === 1 && form.schedule.cadence === "weekly" && !form.schedule.weekdays.length) return "Choose at least one weekday.";
		if (step === 1 && form.metricType === "count" && (!form.targetValue || !form.unit.trim())) return "Add a target and unit for this habit.";
		if (step === 2 && form.reminders.enabled && !form.schedule.times.length) return "Add at least one reminder time.";
		if (step === 2 && form.milestone.enabled && (!form.milestone.targetValue || !form.milestone.dueDate)) return "A milestone needs a target and due date.";
		return "";
	}

	function next() {
		const validation = validateStep();
		if (validation) return setError(validation);
		setError("");
		setStep((current) => Math.min(current + 1, steps.length - 1));
	}

	async function submit() {
		const input = {
			name: form.name.trim(),
			description: form.description.trim(),
			mode: form.mode,
			metricType: form.mode === "quit" ? "binary" : form.metricType,
			targetValue: form.mode === "quit" || form.metricType === "binary" ? 1 : Number(form.targetValue),
			unit: form.mode === "quit" ? "day" : form.unit.trim(),
			color: form.color,
			icon: form.icon,
			startDate: form.startDate,
			schedule: { ...form.schedule, interval: Number(form.schedule.interval), monthDay: Number(form.schedule.monthDay), times: [...form.schedule.times].sort() },
			reminders: form.reminders,
			pauses: form.pauses || [],
		};

		if (!editing && form.milestone.enabled) {
			input.milestone = { type: form.milestone.type, targetValue: Number(form.milestone.targetValue), dueDate: form.milestone.dueDate, rewardText: form.milestone.rewardText.trim(), consequenceText: form.milestone.consequenceText.trim() };
		}

		try {
			const saved = editing
				? await updateHabit.mutateAsync({ habitId, changes: input })
				: await createHabit.mutateAsync(input);
			toast.success(editing ? "Habit updated." : "Your new habit is ready.");
			navigate(`/app/habits/${saved.id}`, { replace: true });
		} catch (saveError) {
			setError(saveError.message);
		}
	}

	return (
		<div className="kept-habit-form-page">
			<div className="kept-form-topbar">
				<Link to={editing ? `/app/habits/${habitId}` : "/app"}><FiArrowLeft /> {editing ? "Back to habit" : "Cancel"}</Link>
				<span>{editing ? "EDIT HABIT" : "NEW HABIT"}</span>
			</div>

			<div className="kept-form-shell">
				<aside>
					<div className="kept-form-progress">{steps.map((label, index) => <button key={label} className={index === step ? "active" : index < step ? "complete" : ""} onClick={() => index < step && setStep(index)}><span>{index < step ? <FiCheck /> : index + 1}</span><div><strong>{label}</strong><small>{["What are you changing?", "When does it happen?", "What helps you continue?", "Does this feel doable?"][index]}</small></div></button>)}</div>
					<div className="kept-form-preview" style={{ "--habit-color": form.color }}><span><HabitIcon name={form.icon} /></span><div><small>LIVE PREVIEW</small><strong>{form.name || "Your habit"}</strong><p>{describeSchedule(previewHabit)}</p></div></div>
				</aside>

				<section className="kept-form-card kept-panel">
					<div className="kept-form-card-heading"><span>STEP {step + 1} OF {steps.length}</span><h1>{["Name the practice", "Choose its rhythm", "Add support, not pressure", "One last look"][step]}</h1><p>{["A clear name makes the next action obvious.", "Your schedule defines when a check-in counts—not when you’re allowed to do it.", "Reminders and milestones should make returning easier.", "You can change every part of this later."][step]}</p></div>

					{step === 0 && <HabitStep form={form} update={update} />}
					{step === 1 && <RhythmStep form={form} update={update} updateSchedule={updateSchedule} />}
					{step === 2 && <SupportStep form={form} updateReminder={updateReminder} updateMilestone={updateMilestone} updateSchedule={updateSchedule} editing={editing} />}
					{step === 3 && <ReviewStep form={form} previewHabit={previewHabit} />}

					{error && <p className="kept-form-error">{error}</p>}
					<div className="kept-form-actions">
						<button className="kept-secondary-button" onClick={() => step === 0 ? navigate(editing ? `/app/habits/${habitId}` : "/app") : setStep((current) => current - 1)}><FiArrowLeft /> {step === 0 ? "Cancel" : "Back"}</button>
						{step < steps.length - 1 ? <button className="kept-primary-button" onClick={next}>Continue <FiArrowRight /></button> : <button className="kept-primary-button" onClick={submit} disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create habit"} <FiCheck /></button>}
					</div>
				</section>
			</div>
		</div>
	);
}

function Choice({ active, onClick, icon, title, copy }) {
	return <button type="button" className={`kept-choice ${active ? "active" : ""}`} onClick={onClick}><span>{icon}</span><strong>{title}</strong><small>{copy}</small></button>;
}

function HabitStep({ form, update }) {
	return (
		<div className="kept-form-body">
			<div className="kept-choice-grid two">
				<Choice active={form.mode === "build"} onClick={() => update("mode", "build")} icon={<FiPlus />} title="Build a habit" copy="Record the action you want to repeat." />
				<Choice active={form.mode === "quit"} onClick={() => { update("mode", "quit"); update("metricType", "binary"); }} icon={<FiMinus />} title="Quit a habit" copy="Record sober or on-track periods." />
			</div>
			<div className="kept-form-field"><label htmlFor="habit-name">Habit name</label><input id="habit-name" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder={form.mode === "quit" ? "e.g. No late-night scrolling" : "e.g. Morning walk"} autoFocus /></div>
			<div className="kept-form-field"><label htmlFor="habit-description">Why this matters <span>(optional)</span></label><textarea id="habit-description" value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="A note for the days when motivation is quiet." /></div>
			<div className="kept-form-field"><label>Color</label><div className="kept-color-grid">{HABIT_COLORS.map((color) => <button key={color} type="button" className={form.color === color ? "active" : ""} style={{ "--swatch": color }} onClick={() => update("color", color)} aria-label={`Use color ${color}`}><FiCheck /></button>)}</div></div>
			<div className="kept-form-field"><label>Icon</label><div className="kept-icon-grid">{HABIT_ICONS.map((icon) => <button key={icon} type="button" className={form.icon === icon ? "active" : ""} onClick={() => update("icon", icon)} aria-label={`Use ${icon} icon`}><HabitIcon name={icon} /></button>)}</div></div>
		</div>
	);
}

function RhythmStep({ form, update, updateSchedule }) {
	const times = form.schedule.times;
	function updateTime(index, value) { updateSchedule("times", times.map((time, itemIndex) => itemIndex === index ? value : time)); }
	return (
		<div className="kept-form-body">
			{form.mode === "build" && <div className="kept-form-field"><label>How will you measure it?</label><div className="kept-choice-grid two"><Choice active={form.metricType === "binary"} onClick={() => update("metricType", "binary")} icon={<FiCheck />} title="Done or not" copy="One clear completion per time slot." /><Choice active={form.metricType === "count"} onClick={() => update("metricType", "count")} icon={<FiPlus />} title="A quantity" copy="Pages, glasses, minutes, repetitions." /></div></div>}
			{form.mode === "build" && form.metricType === "count" && <div className="kept-inline-fields"><div className="kept-form-field"><label htmlFor="target-value">Target per check-in</label><input id="target-value" type="number" min="1" value={form.targetValue} onChange={(event) => update("targetValue", event.target.value)} /></div><div className="kept-form-field"><label htmlFor="target-unit">Unit</label><input id="target-unit" value={form.unit} onChange={(event) => update("unit", event.target.value)} placeholder="pages" /></div></div>}
			<div className="kept-form-field"><label htmlFor="cadence">Repeat</label><select id="cadence" value={form.schedule.cadence} onChange={(event) => updateSchedule("cadence", event.target.value)}><option value="daily">Every day / every few days</option><option value="weekly">On selected weekdays</option><option value="monthly">Monthly / every few months</option></select></div>
			<div className="kept-inline-fields"><div className="kept-form-field"><label htmlFor="interval">Every</label><input id="interval" type="number" min="1" max="30" value={form.schedule.interval} onChange={(event) => updateSchedule("interval", event.target.value)} /></div><div className="kept-form-field"><label>Period</label><div className="kept-static-field">{form.schedule.cadence === "daily" ? "day(s)" : form.schedule.cadence === "weekly" ? "week(s)" : "month(s)"}</div></div></div>
			{form.schedule.cadence === "weekly" && <div className="kept-form-field"><label>Days of the week</label><div className="kept-weekday-grid">{[1, 2, 3, 4, 5, 6, 0].map((day) => { const active = form.schedule.weekdays.includes(day); return <button key={day} type="button" className={active ? "active" : ""} onClick={() => updateSchedule("weekdays", active ? form.schedule.weekdays.filter((item) => item !== day) : [...form.schedule.weekdays, day])}>{weekdayLabel(day, "narrow")}</button>; })}</div></div>}
			{form.schedule.cadence === "monthly" && <div className="kept-form-field"><label htmlFor="month-day">Day of the month</label><input id="month-day" type="number" min="1" max="31" value={form.schedule.monthDay} onChange={(event) => updateSchedule("monthDay", event.target.value)} /><small>For shorter months, Kept uses the last calendar day.</small></div>}
			<div className="kept-form-field"><label htmlFor="start-date">Start date</label><input id="start-date" type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} /></div>
			<div className="kept-form-field"><label>Time slots</label><div className="kept-time-list">{times.map((time, index) => <div key={index}><input type="time" value={time} onInput={(event) => updateTime(index, event.target.value)} aria-label={`Time slot ${index + 1}`} />{times.length > 1 && <button type="button" onClick={() => updateSchedule("times", times.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove time slot ${index + 1}`}><FiMinus /></button>}</div>)}</div>{times.length < 4 && <button className="kept-add-time" type="button" onClick={() => updateSchedule("times", [...times, "18:00"])}><FiPlus /> Add another time</button>}<small>Use two slots for habits such as morning and evening medicine.</small></div>
		</div>
	);
}

function SupportStep({ form, updateReminder, updateMilestone, updateSchedule, editing }) {
	return (
		<div className="kept-form-body">
			<div className="kept-toggle-row"><span><FiBell /><span><strong>Remind me</strong><small>Use the time slots from the previous step.</small></span></span><button type="button" className={form.reminders.enabled ? "active" : ""} onClick={() => updateReminder("enabled", !form.reminders.enabled)} aria-label="Toggle reminders" aria-pressed={form.reminders.enabled}><i /></button></div>
			{form.reminders.enabled && <div className="kept-support-options"><label><input type="checkbox" checked={form.reminders.emailFallback} onChange={(event) => updateReminder("emailFallback", event.target.checked)} /> Use email when push isn’t available</label><label><input type="checkbox" checked={form.reminders.privateCopy} onChange={(event) => updateReminder("privateCopy", event.target.checked)} /> Hide the habit name on the lock screen</label></div>}
			<div className="kept-toggle-row"><span><FiFlag /><span><strong>Add a milestone</strong><small>{editing ? "New milestones are added from the habit page." : "A finish line with an optional reward and consequence."}</small></span></span><button type="button" disabled={editing} className={form.milestone.enabled ? "active" : ""} onClick={() => updateMilestone("enabled", !form.milestone.enabled)} aria-label="Toggle milestone" aria-pressed={form.milestone.enabled}><i /></button></div>
			{form.milestone.enabled && !editing && <div className="kept-milestone-form"><div className="kept-inline-fields"><div className="kept-form-field"><label htmlFor="milestone-type">Measure</label><select id="milestone-type" value={form.milestone.type} onChange={(event) => updateMilestone("type", event.target.value)}><option value="count">Total count</option><option value="streak">Best streak</option></select></div><div className="kept-form-field"><label htmlFor="milestone-target">Target</label><input id="milestone-target" type="number" min="1" value={form.milestone.targetValue} onChange={(event) => updateMilestone("targetValue", event.target.value)} /></div></div><div className="kept-form-field"><label htmlFor="milestone-due">Due date</label><input id="milestone-due" type="date" min={form.startDate} value={form.milestone.dueDate} onChange={(event) => updateMilestone("dueDate", event.target.value)} /></div><div className="kept-form-field"><label htmlFor="reward">Reward <span>(optional)</span></label><input id="reward" value={form.milestone.rewardText} onChange={(event) => updateMilestone("rewardText", event.target.value)} placeholder="A slow Saturday breakfast" /></div><div className="kept-form-field"><label htmlFor="consequence">If I miss it <span>(optional)</span></label><input id="consequence" value={form.milestone.consequenceText} onChange={(event) => updateMilestone("consequenceText", event.target.value)} placeholder="No gaming that evening" /></div></div>}
			{!form.schedule.times.length && form.reminders.enabled && <button className="kept-add-time" onClick={() => updateSchedule("times", ["08:00"])}><FiPlus /> Add a reminder time</button>}
		</div>
	);
}

function ReviewStep({ form, previewHabit }) {
	return (
		<div className="kept-form-body kept-review">
			<div className="kept-review-habit" style={{ "--habit-color": form.color }}><span><HabitIcon name={form.icon} /></span><div><small>{form.mode === "quit" ? "QUIT HABIT" : "BUILD HABIT"}</small><h2>{form.name}</h2><p>{form.description || "No note added—just a clear next action."}</p></div></div>
			<dl><div><dt>Rhythm</dt><dd>{describeSchedule(previewHabit)}</dd></div><div><dt>Target</dt><dd>{describeTarget(previewHabit)}</dd></div><div><dt>Starts</dt><dd>{new Date(`${form.startDate}T12:00:00`).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}</dd></div><div><dt>Reminder</dt><dd>{form.reminders.enabled ? form.reminders.privateCopy ? "On · private text" : "On" : "Off"}</dd></div></dl>
			{form.milestone.enabled && <div className="kept-review-milestone"><FiFlag /><div><span>FIRST MILESTONE</span><strong>{form.milestone.targetValue} {form.milestone.type === "streak" ? "successful periods in a row" : form.metricType === "count" ? form.unit : "successful check-ins"}</strong><p>Due {new Date(`${form.milestone.dueDate}T12:00:00`).toLocaleDateString("en", { month: "long", day: "numeric" })}</p></div></div>}
			<div className="kept-review-note"><span>GOOD TO KNOW</span><p>Missing a quit-habit check-in breaks the verified streak, but Kept will only call it a lapse when you explicitly record one.</p></div>
		</div>
	);
}
