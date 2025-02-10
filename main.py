import os
from github import Github
from utility import *

def main():
    g = Github(os.getenv('GH_PAT'))

    repo_path = os.getenv('REPO_PATH')

    pull_request_number = int(os.getenv('PR_NUMBER'))

    repo = g.get_repo(repo_path)

    pull_request = repo.get_pull(pull_request_number)

    pull_request_diffs = [
        {
            'filename': file.filename,
            'patch': file.patch
        }
        for file in pull_request.get_files()
    ]

    commit_messages = [commit.commit.message for commit in pull_request.get_commits()]

    prompt = format_data_for_openai(pull_request_diffs, commit_messages)

    updated_pr_description = call_openai(prompt)

    pull_request.edit(body=updated_pr_description)

if __name__ == '__main__':
    main()
