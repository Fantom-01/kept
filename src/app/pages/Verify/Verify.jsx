import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../../api/habitApi.js";
import { useAppContext } from "../../context/useAppContext.js";
import "./Verify.css";

export default function Verify() {
	const location = useLocation();
	const navigate = useNavigate();
	const { startSession } = useAppContext();
	const savedAttempt = useMemo(() => JSON.parse(sessionStorage.getItem("kept_auth_attempt") || "null"), []);
	const email = location.state?.email || savedAttempt?.email;
	const devCode = location.state?.devCode || authApi.devCode;
	const [digits, setDigits] = useState(Array(6).fill(""));
	const inputs = useRef([]);
	const verify = useMutation({ mutationFn: ({ email: value, code }) => authApi.verifyOtp(value, code) });

	useEffect(() => {
		if (!email) navigate("/app/sign-in", { replace: true });
	}, [email, navigate]);

	function updateDigit(index, value) {
		const digit = value.replace(/\D/g, "").slice(-1);
		setDigits((current) => current.map((item, itemIndex) => itemIndex === index ? digit : item));
		if (digit && index < 5) inputs.current[index + 1]?.focus();
	}

	function handleKeyDown(index, event) {
		if (event.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
	}

	function pasteCode(event) {
		const code = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
		if (code.length !== 6) return;
		event.preventDefault();
		setDigits(code.split(""));
		inputs.current[5]?.focus();
	}

	async function submit(event) {
		event.preventDefault();
		const session = await verify.mutateAsync({ email, code: digits.join("") });
		startSession(session);
		sessionStorage.removeItem("kept_auth_attempt");
		navigate("/app", { replace: true });
	}

	function fillLocalCode() {
		if (!devCode) return;
		setDigits(devCode.split(""));
		inputs.current[5]?.focus();
	}

	return (
		<div className="kept-auth-page kept-verify">
			<Link className="kept-verify-back" to="/app/sign-in"><FiArrowLeft /> Change email</Link>
			<span>Check your inbox</span>
			<h1>Enter your code</h1>
			<p>Use the six-digit code for <strong>{email}</strong>.</p>
			{devCode && <button className="kept-dev-code" type="button" onClick={fillLocalCode}>
				Local preview code <strong>{devCode}</strong><span>Tap to fill</span>
			</button>}
			<form onSubmit={submit}>
				<div className="kept-code-inputs" onPaste={pasteCode}>
					{digits.map((digit, index) => (
						<input key={index} ref={(element) => { inputs.current[index] = element; }} aria-label={`Digit ${index + 1}`} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} value={digit} onChange={(event) => updateDigit(index, event.target.value)} onKeyDown={(event) => handleKeyDown(index, event)} autoFocus={index === 0} />
					))}
				</div>
				{verify.error && <p className="kept-auth-error">{verify.error.message}</p>}
				<button className="kept-primary-button" disabled={digits.some((digit) => !digit) || verify.isPending}>
					{verify.isPending ? "Opening Kept…" : "Verify and continue"} <FiArrowRight />
				</button>
			</form>
		</div>
	);
}
