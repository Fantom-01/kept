import Brand from "../Brand/Brand.jsx";
import "./PageLoader.css";

export default function PageLoader() {
	return (
		<div className="kept-loader" role="status" aria-label="Loading Kept">
			<Brand />
			<span />
		</div>
	);
}
