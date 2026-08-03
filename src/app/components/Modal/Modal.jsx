import { useEffect } from "react";
import { FiX } from "react-icons/fi";
import "./Modal.css";

export default function Modal({ open, onClose, title, eyebrow, children, className = "" }) {
	useEffect(() => {
		if (!open) return undefined;
		function closeOnEscape(event) {
			if (event.key === "Escape") onClose();
		}
		document.addEventListener("keydown", closeOnEscape);
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", closeOnEscape);
			document.body.style.overflow = "";
		};
	}, [open, onClose]);

	if (!open) return null;
	return (
		<div className="kept-modal-backdrop" onMouseDown={onClose} role="presentation">
			<section
				className={`kept-modal ${className}`}
				onMouseDown={(event) => event.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-labelledby="kept-modal-title"
			>
				<header>
					<div>{eyebrow && <span>{eyebrow}</span>}<h2 id="kept-modal-title">{title}</h2></div>
					<button onClick={onClose} aria-label="Close"><FiX /></button>
				</header>
				{children}
			</section>
		</div>
	);
}
