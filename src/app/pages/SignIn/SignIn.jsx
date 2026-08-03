import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FiArrowRight, FiLock } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { authApi, runtimeMode } from "../../api/habitApi.js";
import "./SignIn.css";

export default function SignIn() {
	const navigate = useNavigate();
	const hosted = runtimeMode === "supabase";
	const [email, setEmail] = useState(hosted ? "" : "you@kept.local");
	const requestCode = useMutation({ mutationFn: (value) => authApi.requestOtp(value) });

	async function submit(event) {
		event.preventDefault();
		const result = await requestCode.mutateAsync(email);
		sessionStorage.setItem("kept_auth_attempt", JSON.stringify({ email: result.email, requestedAt: Date.now() }));
		navigate("/app/verify", { state: { email: result.email, devCode: result.devCode } });
	}

	return (
		<div className="kept-auth-page kept-sign-in">
			<span>Welcome to your practice</span>
			<h1>Continue with email</h1>
			<p>{hosted ? "We’ll send a one-time sign-in code to your inbox." : "Locally, we’ll show your one-time code on the next screen."}</p>
			<form onSubmit={submit}>
				<div className="kept-form-field">
					<label htmlFor="sign-in-email">Email address</label>
					<input id="sign-in-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus />
				</div>
				{requestCode.error && <p className="kept-auth-error">{requestCode.error.message}</p>}
				<button className="kept-primary-button" disabled={requestCode.isPending}>
					{requestCode.isPending ? "Preparing code…" : "Continue"} <FiArrowRight />
				</button>
			</form>
			<div className="kept-local-note"><FiLock /><p><strong>{hosted ? "Secure passwordless sign-in" : "Local-only for now"}</strong><span>{hosted ? "Your habits are private to your account." : "No email is sent and nothing leaves this browser."}</span></p></div>
		</div>
	);
}
