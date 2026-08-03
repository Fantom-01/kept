import {
	FiBookOpen,
	FiCoffee,
	FiDroplet,
	FiFeather,
	FiMoon,
	FiTarget,
	FiTrendingUp,
	FiZap,
} from "react-icons/fi";

const icons = {
	walk: FiTrendingUp,
	book: FiBookOpen,
	water: FiDroplet,
	strength: FiZap,
	leaf: FiFeather,
	focus: FiTarget,
	moon: FiMoon,
	spark: FiCoffee,
};

export default function HabitIcon({ name }) {
	const Icon = icons[name] || FiTarget;
	return <Icon />;
}
