import { FiAlertCircle } from "react-icons/fi";
import PageLoader from "../PageLoader/PageLoader.jsx";

export default function QueryState({ isLoading, error, onRetry, children, fullPage = false }) {
	if (isLoading) return fullPage ? <PageLoader /> : <div className="kept-panel kept-query-skeleton" aria-label="Loading" />;
	if (error) {
		return (
			<div className="kept-query-error" role="alert">
				<FiAlertCircle />
				<div><strong>Something went sideways.</strong><p>{error.message}</p></div>
				{onRetry && <button className="kept-secondary-button" onClick={onRetry}>Try again</button>}
			</div>
		);
	}
	return children;
}
