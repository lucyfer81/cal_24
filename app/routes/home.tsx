import type { Route } from "./+types/home";
import { Game } from "../components/Game";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "24点挑战游戏" },
		{ name: "description", content: "轻量级24点游戏，支持拖拽交互和全球排行榜" },
	];
}

export function loader({ context }: Route.LoaderArgs) {
	return {
		env: {
			DATABASE: context.cloudflare.env.DB,
			ENVIRONMENT: context.cloudflare.env.ENVIRONMENT
		}
	};
}

export default function Home({ loaderData }: Route.ComponentProps) {
	return <Game env={loaderData.env} />;
}
