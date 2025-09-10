const { Octokit } = require('@octokit/rest');
const fs = require('fs-extra');
const path = require('path');
const config = require('../../config');

const octokit = new Octokit({ auth: config.GITHUB.TOKEN });

class SessionManager {
    static async saveSessionToGitHub(number, sessionData) {
        try {
            const sanitizedNumber = number.replace(/[^0-9]/g, '');
            const fileName = `creds_${sanitizedNumber}.json`;
            
            let sha;
            try {
                const { data } = await octokit.repos.getContent({
                    owner: config.GITHUB.OWNER,
                    repo: config.GITHUB.REPO,
                    path: `session/${fileName}`
                });
                sha = data.sha;
            } catch (error) {
                // File doesn't exist yet, no sha needed
            }
            
            await octokit.repos.createOrUpdateFileContents({
                owner: config.GITHUB.OWNER,
                repo: config.GITHUB.REPO,
                path: `session/${fileName}`,
                message: `Update session for ${sanitizedNumber}`,
                content: Buffer.from(JSON.stringify(sessionData, null, 2)).toString('base64'),
                sha: sha
            });
            
            console.log(`✅ Session saved to GitHub for ${sanitizedNumber}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to save session to GitHub:', error);
            return false;
        }
    }
    
    static async restoreSession(number) {
        try {
            const sanitizedNumber = number.replace(/[^0-9]/g, '');
            const fileName = `creds_${sanitizedNumber}.json`;
            
            const { data } = await octokit.repos.getContent({
                owner: config.GITHUB.OWNER,
                repo: config.GITHUB.REPO,
                path: `session/${fileName}`
            });
            
            const content = Buffer.from(data.content, 'base64').toString('utf8');
            return JSON.parse(content);
        } catch (error) {
            console.warn('No session found on GitHub for', number);
            return null;
        }
    }
    
    static async cleanDuplicateFiles(number) {
        try {
            const sanitizedNumber = number.replace(/[^0-9]/g, '');
            
            const { data } = await octokit.repos.getContent({
                owner: config.GITHUB.OWNER,
                repo: config.GITHUB.REPO,
                path: 'session'
            });
            
            const sessionFiles = data.filter(file => 
                file.name.startsWith(`creds_${sanitizedNumber}_`) && file.name.endsWith('.json')
            ).sort((a, b) => {
                const timeA = parseInt(a.name.match(/creds_\d+_(\d+)\.json/)?.[1] || 0);
                const timeB = parseInt(b.name.match(/creds_\d+_(\d+)\.json/)?.[1] || 0);
                return timeB - timeA;
            });
            
            if (sessionFiles.length > 1) {
                for (let i = 1; i < sessionFiles.length; i++) {
                    await octokit.repos.deleteFile({
                        owner: config.GITHUB.OWNER,
                        repo: config.GITHUB.REPO,
                        path: `session/${sessionFiles[i].name}`,
                        message: `Delete duplicate session file for ${sanitizedNumber}`,
                        sha: sessionFiles[i].sha
                    });
                    console.log(`Deleted duplicate session file: ${sessionFiles[i].name}`);
                }
            }
        } catch (error) {
            console.error('Failed to clean duplicate files:', error);
        }
    }
    
    static async deleteSessionFromGitHub(number) {
        try {
            const sanitizedNumber = number.replace(/[^0-9]/g, '');
            const { data } = await octokit.repos.getContent({
                owner: config.GITHUB.OWNER,
                repo: config.GITHUB.REPO,
                path: 'session'
            });

            const sessionFiles = data.filter(file =>
                file.name.includes(sanitizedNumber) && file.name.endsWith('.json')
            );

            for (const file of sessionFiles) {
                await octokit.repos.deleteFile({
                    owner: config.GITHUB.OWNER,
                    repo: config.GITHUB.REPO,
                    path: `session/${file.name}`,
                    message: `Delete session for ${sanitizedNumber}`,
                    sha: file.sha
                });
                console.log(`Deleted GitHub session file: ${file.name}`);
            }

            // Update numbers.json on GitHub
            await this.updateNumberListOnGitHub(sanitizedNumber, true);

        } catch (error) {
            console.error('Failed to delete session from GitHub:', error);
        }
    }
    
    static async loadUserConfig(number) {
        try {
            const sanitizedNumber = number.replace(/[^0-9]/g, '');
            const configPath = `session/config_${sanitizedNumber}.json`;
            
            const { data } = await octokit.repos.getContent({
                owner: config.GITHUB.OWNER,
                repo: config.GITHUB.REPO,
                path: configPath
            });

            const content = Buffer.from(data.content, 'base64').toString('utf8');
            return JSON.parse(content);
        } catch (error) {
            console.warn(`No configuration found for ${number}, using default config`);
            return { ...config };
        }
    }
    
    static async updateUserConfig(number, newConfig) {
        try {
            const sanitizedNumber = number.replace(/[^0-9]/g, '');
            const configPath = `session/config_${sanitizedNumber}.json`;
            let sha;

            try {
                const { data } = await octokit.repos.getContent({
                    owner: config.GITHUB.OWNER,
                    repo: config.GITHUB.REPO,
                    path: configPath
                });
                sha = data.sha;
            } catch (error) {
                // Config file doesn't exist yet
            }

            await octokit.repos.createOrUpdateFileContents({
                owner: config.GITHUB.OWNER,
                repo: config.GITHUB.REPO,
                path: configPath,
                message: `Update config for ${sanitizedNumber}`,
                content: Buffer.from(JSON.stringify(newConfig, null, 2)).toString('base64'),
                sha
            });
            console.log(`Updated config for ${sanitizedNumber}`);
        } catch (error) {
            console.error('Failed to update config:', error);
            throw error;
        }
    }
    
    static async updateNumberListOnGitHub(number, remove = false) {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const pathOnGitHub = 'session/numbers.json';
        let numbers = [];

        try {
            const { data } = await octokit.repos.getContent({ 
                owner: config.GITHUB.OWNER, 
                repo: config.GITHUB.REPO, 
                path: pathOnGitHub 
            });
            const content = Buffer.from(data.content, 'base64').toString('utf8');
            numbers = JSON.parse(content);

            if (remove) {
                numbers = numbers.filter(n => n !== sanitizedNumber);
            } else if (!numbers.includes(sanitizedNumber)) {
                numbers.push(sanitizedNumber);
            }

            await octokit.repos.createOrUpdateFileContents({
                owner: config.GITHUB.OWNER,
                repo: config.GITHUB.REPO,
                path: pathOnGitHub,
                message: remove ? `Remove ${sanitizedNumber} from numbers list` : `Add ${sanitizedNumber} to numbers list`,
                content: Buffer.from(JSON.stringify(numbers, null, 2)).toString('base64'),
                sha: data.sha
            });
            
            console.log(`✅ ${remove ? 'Removed' : 'Added'} ${sanitizedNumber} to GitHub numbers.json`);
        } catch (err) {
            if (err.status === 404 && !remove) {
                numbers = [sanitizedNumber];
                await octokit.repos.createOrUpdateFileContents({
                    owner: config.GITHUB.OWNER,
                    repo: config.GITHUB.REPO,
                    path: pathOnGitHub,
                    message: `Create numbers.json with ${sanitizedNumber}`,
                    content: Buffer.from(JSON.stringify(numbers, null, 2)).toString('base64')
                });
                console.log(`📁 Created GitHub numbers.json with ${sanitizedNumber}`);
            } else {
                console.error('❌ Failed to update numbers.json:', err.message);
            }
        }
    }
}

module.exports = SessionManager;
