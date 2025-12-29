# Code Review Checklist

## Input validation issues

- [ ]Inputs from external sources are validated.
- [x]User input is tested for type, length, format, and range, and by enforcing limits.
- [ ]Regular expressions are checked for flaws that could cause data validation problems.
- [ ]Check that input is validated using: Exact match approaches and/or, Allow lists and/or, Block lists
- [ ]XML documents should be validated against their schemas.
- [x]String concatenations should not be used for user input.
- [x]SQL statements should not be dynamically created by using user input.
- [ ]Data should always be (re)-validated on the server side.
- [x]Check that there is a strong separation between data and commands, and data and client-side scripts.
- [x]Check for contextual escaping use when passing data to SQL, LDAP, OS, and third-party commands.
- [ ]Validate https headers for each request.

## Authentication and authorization flaws
- [x]Sessions are handled correctly.
- [x]Failure messages for invalid usernames or passwords are not leaking information.
- [x]Invalid passwords should not be logged as they can leak sensitive password & user name combinations.
- [ ]Password length and complexity is sufficient.
- [ ]Invalid login attempts are correctly handled with lockouts, and rate limits.
- [ ]The "forgot password" feature should not leak information, and should not be vulnerable to spamming.
- [x]Passwords should not be sent in plain text via email.
- [x]Passwords and usernames are stored using appropriate mechanisms such as hashing, salts, and encryption.
- [x]Authentication and authorization should be executed first for each request.
- [ ]Authorization checks are sufficiently granular.
- [ ]Authorization should use a deny by default approach.
- [ ]Authorization for roles should be clear and correctly applied.
- [ ]Parameter and cookie manipulation should not be able to circumvent proper authorization.

## Data encryption and secure communication
- [x]Appropriate standard encryption algorithms are used for public key, symmetric encryption signatures, and hashes.
- [x]Appropriate standard key sizes are used.
- [x]Encryption keys are handled securely.
- [ ]Data is encrypted at rest using appropriate levels of encryption.
- [x]TLS is used for all communication.

## Exception handling and logging
- [x]All methods should have appropriate exception handling.
- [x]Error messages shown to users should not reveal sensitive information including stack traces and IDs.
- [x]The application should fail securely when exceptions occur.
- [x]System errors should never be shown to users.
- [ ]Debug information should never be shown to users.
- [ ]Resources are appropriately released and transactions are rolled back when there is an error.
- [ ]There is an appropriate level of logging of user and system actions.
- [ ]Sensitive information is never logged.
- [ ]All important user management events such as password resets are logged.
- [ ]Unusual activities such as multiple login attempts are logged.
- [ ]Logs should have enough detail to reconstruct events for audit purposes.

## Dependency management
- [ ]Assess all third-party libraries and dependencies used (and removed) by the code.
- [ ]Check for known vulnerabilities with the specific versions used.
- [ ]Look for potential conflicts with other dependencies.
- [ ]Review the third-party code (and check how often it's updated).
- [ ]Look at warnings provided by automated tools such as dependabot.

## Proper use of API and integration points
- [x]Correct use of corresponding authentication and authorization between application and API.
- [x]Use of API keys.
- [ ]Validation of data sent and received from APIs.
- [ ]Appropriate levels of access control on data stored by services.
- [ ]Volume and rate of API calls.
- [x]API exception handling and logging.

## Cross-site request forgery (CSRF) protections
- [x]Check for CSRF tokens in applications that perform state-changing operations based on user requests. Many development frameworks (like Django for example) include simple means of enabling CSRF protection in applications. OWASP provides a more detailed look at how to check for CSRF vulnerabilities.

##  Server-side code execution validation
- [x]Ensure that server-side code properly validates user input and does not execute untrusted data.

## Business logic errors
- [ ]Identify flaws in the application logic that could be exploited, such as bypassing payment processes or changing user privilege levels.

## Code quality and best practices
- [ ]The developer has submitted all required documentation, test results, and analysis scans.
- [x]The code addresses the reasons for it being committed to the code base.
- [x]Code adheres to the team's style guide.
- [x]Code is properly documented such that reviewers can understand its purpose and structure.