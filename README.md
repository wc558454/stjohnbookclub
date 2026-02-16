# St. John Chrysostom Bookclub

A specialized platform for spiritual reading fellowship, designed for the St. Paul Hospital Medical College Campus Fellowship.

## Features

- **Personalized Dashboards**: Track reading progress against a current book.
- **Spiritual Challenges**: Earn points through Daily Reflections and Fellowship Nudges.
- **Discussion Check-ins**: Join scheduled discussions and earn rewards for participation.
- **Admin Command Center**: Manage members, the library, and spiritual challenges.
- **Real-time Leaderboard**: See fellowship ranks and streaks.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS & ShadCN UI
- **Backend**: Firebase (Firestore, Auth)
- **AI Integration**: Genkit for spiritual insights

## Getting Started

1. **Setup Firebase**: Ensure you have a Firebase project created via the Firebase Console.
2. **Environment Variables**: Configure your Firebase keys in the project settings.
3. **Admin Setup**: To access the Admin Panel, add your UID to the `roles_admin` collection in Firestore.

## Deployment

This project is configured for deployment using **Firebase App Hosting**.

1. **Connect to GitHub**: In the Firebase Console, navigate to the App Hosting section and connect your GitHub repository.
2. **Automated Deploys**: Once connected, App Hosting will automatically build and deploy your application whenever you push new commits to your main branch.

The `apphosting.yaml` file in the root directory contains the configuration for the App Hosting backend.

## Credits

Developed by William for the fellowship community.
