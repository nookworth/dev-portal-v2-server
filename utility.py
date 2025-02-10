import os
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

def format_data_for_openai(diffs, commit_messages):
    prompt = None

    changes = "\n".join(
        [f'File: {file["filename"]}\nDiff: \n{file["patch"]}\n' for file in diffs]
    )

    commit_messages = "\n".join(commit_messages) + "\n\n"

    prompt = (
        "Please review the following code changes and commit messages from a GitHub pull request:\n"
        "Code changes from Pull Request:\n"
        f"{changes}\n"
        "Commit messages:\n"
        f"{commit_messages}"
        "Consider the code changes from the Pull Request (including changes in docstrings and other metadata), and the commit messages. Create a new PR description that is clear and concise, and includes the most important changes.\n"
        "Updated PR description:\n"
    )

    return prompt

def call_openai(prompt):
    client = ChatOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    try:
        messages = [
            {
                "role": "system",
                "content": "You are an AI trained to help with updating PR descriptions based on code changes.",
            },
            {
                "role": "user",
                "content": prompt
            },
        ]

        response = client.invoke(input=messages)
        parser = StrOutputParser()
        content = parser.invoke(input=response)

        return content
    except Exception as e:
        print(f"Error making OpenAI API call: {e}")

def update_readme_and_create_pr(repo, updated_readme, readme_sha):
    """
    Submit Updated README content as a PR in a new branch
    """

    commit_message = "Proposed README update based on recent code changes"
    main_branch = repo.get_branch("main")
    new_branch_name = f"update-readme-{readme_sha[:10]}"
    new_branch = repo.create_git_ref(
        ref=f"refs/heads/{new_branch_name}", sha=main_branch.commit.sha
    )

    repo.update_file(
        path="README.md",
        message=commit_message,
        content=updated_readme,
        sha=readme_sha,
        branch=new_branch_name,
    )

    pr_title = "Update README based on recent changes"
    br_body = "This PR proposes an update to the README based on recent code changes. Please review and merge if appropriate."
    pull_request = repo.create_pull(
        title=pr_title, body=br_body, head=new_branch_name, base="main"
    )

    return pull_request