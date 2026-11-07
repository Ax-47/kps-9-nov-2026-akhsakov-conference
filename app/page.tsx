import Deck from "@/components/Deck";
import { loadDeck } from "@/lib/deck";

export default function Home() {
  const deck = loadDeck();
  return <Deck title={deck.title} slides={deck.slides} />;
}
