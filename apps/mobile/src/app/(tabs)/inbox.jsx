// Creator Inbox - renders shared component
import { useUser } from "@clerk/clerk-expo";
import SharedInboxScreen from "@/components/inbox/InboxScreen";
import SignedOutState from "@/components/SignedOutState";

export default function CreatorInboxScreen() {
  const { isSignedIn, isLoaded } = useUser();
  if (isLoaded && !isSignedIn) {
    return (
      <SignedOutState
        art={require("../../../assets/images/empty-inbox.png")}
        title="Sign in to see your messages"
        body="Chats with hosts sync to your account once you're signed in."
      />
    );
  }
  return <SharedInboxScreen viewAs="creator" />;
}
