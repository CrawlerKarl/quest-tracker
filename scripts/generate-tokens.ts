import crypto from 'crypto';

// Generate secure, URL-safe tokens
function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

const menteeToken = generateToken();
const mentorToken = generateToken();
const cookieSecret = generateToken(32);

console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                    🎮 QUEST TRACKER TOKENS 🎮                        ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  Copy these values into your Vercel Environment Variables:           ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝

MENTEE_TOKEN=${menteeToken}
MENTOR_TOKEN=${mentorToken}
COOKIE_SECRET=${cookieSecret}

╔══════════════════════════════════════════════════════════════════════╗
║                         YOUR SECRET URLS                             ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  After deploying to Vercel, your URLs will be:                       ║
║                                                                      ║
║  🧑‍🏫 MENTOR URL (for you):                                          ║
║     https://YOUR-APP-NAME.vercel.app/enter/mentor/${mentorToken}
║                                                                      ║
║  🧑‍💻 MENTEE URL (share with your mentee):                           ║
║     https://YOUR-APP-NAME.vercel.app/enter/mentee/${menteeToken}
║                                                                      ║
║  Replace YOUR-APP-NAME with your actual Vercel app name!             ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝

⚠️  IMPORTANT:
   • Save these tokens somewhere safe - you can't recover them!
   • Never share the mentor URL with anyone
   • The mentee URL should only be shared with your mentee
   • Share via Signal, iMessage, or in person - not regular email

`);
