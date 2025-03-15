import { Devvit } from '@devvit/public-api';

// Enable Redis and Reddit API
Devvit.configure({
  redis: true,
  redditAPI: true
});

// Define the TL;DR summary type
type Summary = {
  id: string;
  text: string;
  author: string;
  score: number;
  voters: Record<string, number>; // userId: vote (-1, 0, 1)
};

Devvit.addCustomPostType({
  name: 'WDYMYAPPER',
  render: ({ useState, useForm, ui, redis, reddit }) => {
    // State for summaries
    const [summaries, setSummaries] = useState<Summary[]>([
      // Initial placeholder summary
      {
        id: '1',
        text: 'This is a summary of the post. It explains the key points in a concise way that saves time for readers.',
        author: 'wdymyapper_bot',
        score: 10,
        voters: {},
      },
    ]);
    const [isLoading, setIsLoading] = useState(false);

    // Form for submitting a new TL;DR
    const tldrForm = useForm(
      {
        title: 'Add your TL;DR summary',
        fields: [
          {
            name: 'summary',
            label: 'Your TL;DR',
            type: 'string',
            multiline: true,
          },
        ],
        acceptLabel: 'Submit',
      },
      async (values) => {
        try {
          setIsLoading(true);
          
          // Get current user
          const currentUser = await reddit.getCurrentUser();
          
          // Create new summary
          const newSummary: Summary = {
            id: Date.now().toString(),
            text: values.summary,
            author: currentUser.username,
            score: 1, // Start with 1 upvote (your own)
            voters: {
              [currentUser.id]: 1, // Current user upvoted
            },
          };
          
          // Add to summaries
          setSummaries([...summaries, newSummary]);
          
          // Show success message
          ui.showToast('Your TL;DR has been added!');
        } catch (error) {
          ui.showToast('Failed to add your TL;DR. Please try again.');
        } finally {
          setIsLoading(false);
        }
      }
    );

    // Handle voting
    const handleVote = async (summaryId: string, vote: 1 | -1) => {
      try {
        setIsLoading(true);
        
        // Get current user
        const currentUser = await reddit.getCurrentUser();
        
        // Update summaries with new vote
        setSummaries(
          summaries.map((summary) => {
            if (summary.id === summaryId) {
              // Check if user already voted
              const previousVote = summary.voters[currentUser.id] || 0;
              
              // Calculate score change
              const scoreChange = vote - previousVote;
              
              // Return updated summary
              return {
                ...summary,
                score: summary.score + scoreChange,
                voters: {
                  ...summary.voters,
                  [currentUser.id]: vote,
                },
              };
            }
            return summary;
          })
        );
      } catch (error) {
        ui.showToast('Failed to register your vote. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    // Sort summaries by score (highest first)
    const sortedSummaries = [...summaries].sort((a, b) => b.score - a.score);
    
    return (
      <blocks height="tall">
        <vstack padding="medium" gap="medium">
          {/* Header */}
          <hstack alignment="center middle" gap="small">
            <text style="heading" size="xlarge">🔥 WDYMYAPPER 🔥</text>
          </hstack>
          <text style="heading" size="medium">Summarize this post (TL;DR):</text>
          
          {/* Summaries Section */}
          <vstack gap="large" padding="small">
            <text style="heading" size="small">Community TL;DRs:</text>
            
            {sortedSummaries.length === 0 ? (
              <text>No summaries yet. Be the first to add one!</text>
            ) : (
              <vstack gap="medium">
                {sortedSummaries.map((summary, index) => (
                  <vstack 
                    key={summary.id} 
                    padding="medium" 
                    gap="small"
                    border="thin"
                    borderColor={index === 0 ? "blue" : "neutral"}
                    cornerRadius="medium"
                  >
                    {index === 0 && (
                      <hstack alignment="center middle">
                        <text style="heading" size="xsmall" color="blue">⭐ TOP SUMMARY ⭐</text>
                      </hstack>
                    )}
                    <text>{summary.text}</text>
                    <hstack gap="small">
                      <text size="small" color="textSecondary">Author: u/{summary.author}</text>
                      <text size="small" color="textSecondary">Score: {summary.score}</text>
                    </hstack>
                    <hstack gap="medium" alignment="center middle">
                      <button 
                        icon="upvote" 
                        onPress={() => handleVote(summary.id, 1)}
                        disabled={isLoading}
                      />
                      <button 
                        icon="downvote" 
                        onPress={() => handleVote(summary.id, -1)}
                        disabled={isLoading}
                      />
                    </hstack>
                  </vstack>
                ))}
              </vstack>
            )}
          </vstack>
          
          {/* Add TL;DR Section */}
          <vstack gap="medium" padding="small" border="thin" cornerRadius="medium">
            <text style="heading" size="small">Want to add a better TL;DR?</text>
            <button 
              onPress={() => ui.showForm(tldrForm)}
              appearance="primary"
              disabled={isLoading}
            >
              Submit New TL;DR
            </button>
          </vstack>
        </vstack>
      </blocks>
    );
  },
});

// Add menu item to create the WDYMYAPPER post
Devvit.addMenuItem({
  label: 'Add WDYMYAPPER Summary',
  location: 'subreddit',
  onPress: async (_, context) => {
    const currentSubreddit = await context.reddit.getCurrentSubreddit();
    await context.reddit.submitPost({
      title: 'WDYMYAPPER - Summarize this post!',
      subredditName: currentSubreddit.name,
      preview: (
        <vstack>
          <text>Loading WDYMYAPPER...</text>
        </vstack>
      ),
    });
    context.ui.showToast(`Created WDYMYAPPER in r/${currentSubreddit.name}`);
  },
});

export default Devvit;