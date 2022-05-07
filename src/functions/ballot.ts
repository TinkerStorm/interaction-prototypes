import { Collection } from 'slash-create';

type Ballot = Map<string, string>;
type BallotCounts = Collection<string, number>;
type BallotOutcome = null | string | string[];

type BallotResult = [outcome: BallotOutcome, counts: BallotCounts];

// a vote can be null, a string or an array of strings
// 1) null: inconclusive
// 2) string: unanimous / majority
// 3) array: split vote between two or more players
// - a player can only vote once, but can change their vote
// - a player can vote for themselves
export function determineResult(votes: Ballot): BallotResult {
  const voteCounts: BallotCounts = new Collection();

  for (const vote of votes.values()) {
    if (vote === null) continue;

    if (!voteCounts.has(vote)) voteCounts.set(vote, 0);

    voteCounts.set(vote, voteCounts.get(vote) + 1);
  }

  const topSorted = Array.from(voteCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .filter(([, count], _, array) => count >= array[0][1])
    .map(([id]) => id);

  let result = null;
  if (topSorted.length === 1) result = topSorted[0];
  else if (topSorted.length > 1) result = topSorted;

  return [result, voteCounts];
}
